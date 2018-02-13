import ChartAnalyzer from '../chart/chart-analyzer';
import ChartWorker from '../chart/chart-worker';
import { config } from '../../config';
import Equation from '../chart/equation';
import Logger from '../logger/index';
import Market from '../interfaces/market';
import Trading from '../interfaces/trader';
import { Accounts } from '../market/accounts';
import { ChartWork } from '../chart/chart-work';
import { Currency } from '../interfaces/currency.enum';
import { Subscription } from 'rxjs/Subscription';
import { Trade } from './trade';
import { TraderState } from './trader-state';
import { TradeType } from './trade-type';
import { Trend } from '../chart/trend.enum';
import { writeFile, readFile } from 'fs';
import { OrderResult } from '../market/order';
import { promisify } from 'util';
import { DataStorage } from './data';
import Slack from '../slack/index';


class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker
    workObserver: Subscription
    state: TraderState
    chartAnalyzer: ChartAnalyzer
    quoteCurrency: Currency
    quoteCurrencyBalance: number // €, $, £, etc.
    initialQuoteCurrencyBalance: number
    baseCurrency: Currency
    baseCurrencyBalance: number // BTC, ETH, LTC, etc.
    initialBaseCurrencyBalance: number

    trades: Trade[]
    lastBuyTrade: Trade
    lastSellTrade: Trade

    private works: ChartWork[]
    private lastWork: ChartWork
    private clearWorksAfterTrade: boolean
    private slack: Slack
    private startTime: Date

    constructor(market: Market) {
        this.market = market
        this.accounts = market.accounts
        this.chartWorker = new ChartWorker(market)
        this.works = []
        this.lastWork = null
        this.trades = []
        this.lastBuyTrade = null
        this.lastSellTrade = null
        this.state = TraderState.WAITING_TO_BUY
        this.chartAnalyzer = new ChartAnalyzer(this.chartWorker)
        this.clearWorksAfterTrade = true
        this.slack = new Slack(this)

        // Currencies
        this.quoteCurrency = config.account.quoteCurrency
        this.quoteCurrencyBalance = 0
        this.initialQuoteCurrencyBalance = null
        this.baseCurrency = config.account.baseCurrency
        this.baseCurrencyBalance = 0
        this.initialBaseCurrencyBalance = null
    }

    async updateBalances() {
        this.quoteCurrencyBalance = await this.accounts.availableFunds(this.quoteCurrency)
        this.baseCurrencyBalance = await this.accounts.availableFunds(this.baseCurrency)
        this.verifyBalances()

        if (null === this.initialBaseCurrencyBalance) {
            this.initialBaseCurrencyBalance = this.baseCurrencyBalance
        }

        if (null === this.initialQuoteCurrencyBalance) {
            this.initialQuoteCurrencyBalance = this.quoteCurrencyBalance
        }
    }

    private verifyBalances() {
        if (this.quoteCurrencyBalance < config.trader.minQuantityQuoteCurrencyToUse) {
            Logger.debug(`WARN: The ${this.quoteCurrency} balance (${this.quoteCurrencyBalance} ${this.quoteCurrency}) is under the min quantity desired to use (${config.trader.minQuantityQuoteCurrencyToUse} ${this.quoteCurrency})`)
        } else if (this.quoteCurrencyBalance > config.trader.maxQuantityQuoteCurrencyToUse) {
            Logger.debug(`The ${this.quoteCurrency} balance (${this.quoteCurrencyBalance} ${this.quoteCurrency}) is over the max quantity desired to use (${config.trader.maxQuantityQuoteCurrencyToUse} ${this.quoteCurrency})`)
            Logger.debug('Using the max quantity as balance')

            this.quoteCurrencyBalance = config.trader.maxQuantityQuoteCurrencyToUse
        }
    }

    async trade() {
        if (!this.market.currency) {
            Logger.error('Currency is not set, stopping trading.')
            this.stop()

            return
        }

        this.startTime = new Date()

        try {
            await this.loadData()
            await this.updateBalances()

            Logger.debug('\nBalances:')
            Logger.debug(`    ${this.quoteCurrency}: ${this.quoteCurrencyBalance}`)
            Logger.debug(`    ${this.baseCurrency}: ${this.baseCurrencyBalance}\n`)
        } catch (error) {
            Logger.error(`Fatal error occured while trying to retrieve account balances: ${JSON.stringify(error, null, 2)}`)

            return
        }

        this.watchChartWorker()
        this.chartWorker.startWorking()
    }

    watchChartWorker() {
        this.workObserver = this.chartWorker.work$.subscribe(async (work: ChartWork) => {
            this.works = this.chartWorker.filterNoise(this.chartWorker.copyWorks())

            const newLastWork = this.getLastWork()

            Logger.debug(`\n--------------- ${newLastWork.price} ${this.quoteCurrency} -----------------\n`)

            if (!this.worksAreEquals(newLastWork, this.lastWork)) {
                this.lastWork = newLastWork
                await this.analyzeWorks()
            } else {
                Logger.debug('Waiting a new point...')
            }

            this.persistData()

            Logger.debug('\n')
        })
    }

    async analyzeWorks() {
        Logger.debug('Analyzing chart...')
        Logger.debug(`Time: ${this.lastWork.time}`)

        if (TraderState.WAITING_TO_BUY === this.state) {
            await this.buyStrategies()
        } else if (TraderState.WAITING_TO_SELL === this.state) {
            await this.sellStrategies()
        } else if (TraderState.WAITING_FOR_API_RESPONSE === this.state) {
            Logger.debug('Trader tried to analyze next work before waiting api response for the last request. Please check your network latency.')
        } else {
            Logger.error(`Trader.state does not match any action: ${this.state}`)
            this.stop() // No action to be done, trader is maybe crashed, need external intervention
        }
    }

    async buyStrategies() {
        Logger.debug('Trader wants to buy.')

        /*
         * Trader is waiting to buy
         * we will try to know if we are in a hollow case or upward trend
         */
        if (this.chartAnalyzer.detectHollow(this.works)/* || this.chartAnalyzer.isUpwardTrendConfirmed(this.lastWork, this.works)*/) {
            const funds = this.fundsToUse()

            Logger.debug(`Trader is buying at ${this.lastWork.price} ${this.quoteCurrency}`)

            // We have sold, and the current price is below since the last price we sold so we can buy
            await this.buy(funds)
        } else {
            Logger.debug('Waiting for a buy signal...')
        }
    }

    async sellStrategies() {
        Logger.debug('Trader wants to sell.')

        let size
        let priceToSell = this.lastWork.price

        try {
            size = this.market.orders.normalizeQuantity(this.sizeToUse())
        } catch (error) {
            Logger.error(error)
            this.stop()

            return
        }

        if (config.trader.sellWhenPriceExceedsMaxThresholdOfProfitability && this.lastWork.price >= Equation.maxThresholdPriceOfProfitability(this.lastBuyTrade.price)) {
            /*
             * Option sellWhenPriceExceedsThresholdOfProfitability is activated
             * So, we sell because de price exceeds the max threshold of profitability defined
             */
            Logger.debug(`Max threshold of profitability reached (profitability: ${config.trader.maxThresholdOfProfitability}%)`)
            Logger.debug(`Trader is selling at ${this.lastWork.price}`)
            await this.sell(size)
        } else if (config.trader.sellWhenPriceExceedsMinThresholdOfProfitability && Equation.isProfitable(this.lastBuyTrade.price, this.lastWork.price) && !Equation.isProfitable(this.lastBuyTrade.price, this.lastWork.lastPrice)) {
            /*
             * Options sellWhenPriceExceedsMinThresholdOfProfitability is activated
             * So, we sell because de price exceeds the min threshold of profitability defined
             */
            Logger.debug(`Min threshold of profitability reached (profitability: ${config.trader.minThresholdOfProfitability}%)`)
            Logger.debug(`Trader is selling at ${this.lastWork.price}`)

            let partSizeToSell = size * (config.trader.quantityToSellWhenPriceExceedsMinThresholdOfProfitability / 100)
            const minQuantity = this.market.orders.getMinQuantity()

            Logger.debug(`Quantity desired to sell: ${partSizeToSell} ${this.baseCurrency} (${config.trader.quantityToSellWhenPriceExceedsMinThresholdOfProfitability}%)`)

            try {
                partSizeToSell = this.market.orders.normalizeQuantity(partSizeToSell)
                this.clearWorksAfterTrade = false // We will want to sell if there is a bump after min threshold and max threshold not reached

                const quantityRemaining = this.market.orders.normalizeQuantity(size - partSizeToSell)

                if (quantityRemaining < minQuantity) {
                    // The remaining quantity is below the minQuantity, so we sell all the quantity
                    Logger.debug(`If we sell ${config.trader.quantityToSellWhenPriceExceedsMinThresholdOfProfitability}% of the quantity, the remaining quantity is below the minQuantity. Selling all the quantity`)
                    partSizeToSell = size
                    this.clearWorksAfterTrade = true
                }
            } catch (error) {
                // partSizeToSell is below the minQuantity, we set it to it
                Logger.debug(`${config.trader.quantityToSellWhenPriceExceedsMinThresholdOfProfitability}% of the quantity is below the minQuantity. Taking the minQuantity as quantity to sell`)
                partSizeToSell = minQuantity
            }

            Logger.debug(`Selling ${partSizeToSell} ${this.baseCurrency}`)

            const partial = partSizeToSell !== size // if we don't sell all the size, this means we only sell a part

            await this.sell(partSizeToSell, partial)
        } else if (config.trader.useExitStrategyInCaseOfLosses && Equation.rateBetweenValues(this.lastBuyTrade.price, this.lastWork.price) <= -config.trader.sellWhenLossRateReaches) {
            /*
             * Option useExitStrategyInCaseOfLosses is activated
             * So, we sell because the loss is below the limit we fixed
             */
            Logger.debug('Threshold of loss rate reached')
            Logger.debug(`Trader is selling at ${this.lastWork.price}`)
            await this.sell(size)
        } else if (this.chartAnalyzer.detectBump(this.works)) {
            /*
             * We found a bump, is the trader is profitable, he sells
             */
            Logger.debug('Bump detected!')

            if (Equation.isProfitable(this.lastBuyTrade.price, this.lastWork.price)) {
                Logger.debug(`Trader is selling at ${this.lastWork.price}`)
                await this.sell(size)
            } else {
                Logger.debug('Not sold! Was not profitable')

                // Bump was not enough up in order to sell, but we clear works in order to avoid to loop through it later in analyzer
                this.prepareForNewTrade()
            }
        } else if (!this.chartWorker.isInFastMode() && this.chartAnalyzer.detectProfitablePump(this.works, this.lastBuyTrade.price)) {
            /*
             * Fast mode
             * Detect pump which can be profitable to sell in
             * We accelerate the ticker interval until trader try to sell
             */
            Logger.debug('Fast mode activated')
            this.chartWorker.fastMode()
        } else {
            Logger.debug('Waiting for a sell signal...')
        }
    }

    fundsToUse(): number {
        const funds = (config.trader.quantityOfQuoteCurrencyToUse / 100) * this.quoteCurrencyBalance

        if (funds > config.trader.maxQuantityQuoteCurrencyToUse) {
            return config.trader.maxQuantityQuoteCurrencyToUse
        }

        if (funds < config.trader.minQuantityQuoteCurrencyToUse) {
            if (config.trader.minQuantityQuoteCurrencyToUse > this.quoteCurrencyBalance) {
                Logger.debug(`Trader has not enough funds (minQuantityQuoteCurrencyToUse is not respected: ${config.trader.minQuantityQuoteCurrencyToUse}, current balance: ${this.quoteCurrencyBalance})`)
                this.stop()
            }

            return config.trader.minQuantityQuoteCurrencyToUse
        }

        return funds
    }

    sizeToUse(): number {
        return (config.trader.quantityOfBaseCurrencyToUse / 100) * this.baseCurrencyBalance
    }

    prepareForNewTrade() {
        if (this.clearWorksAfterTrade) {
            this.chartWorker.prepareForNewWorks()
        } else {
            this.clearWorksAfterTrade = true // next time we come back to the default behaviour
        }
    }

    async buy(funds: number) {
        try {
            if (!Number.isFinite(funds)) {
                throw new Error(`Cannot buy, funds are invalid: ${funds}`)
            }

            Logger.debug(`Trying to buy with ${funds} ${this.quoteCurrency}`)
            Logger.debug('Sending order to the market...')

            this.state = TraderState.WAITING_FOR_API_RESPONSE

            const lastWorkBackup = { ...this.lastWork }

            const order = await this.market.orders.buyMarket(this.market.currency, funds, lastWorkBackup.price)
            const price = order.price || lastWorkBackup.price
            const fundsUsed = price * order.executedQuantity
            const fees = fundsUsed * config.market.orderFees

            if (config.api.sandbox) {
                this.quoteCurrencyBalance -= fundsUsed
                this.baseCurrencyBalance += order.executedQuantity
            } else {
                await this.updateBalances()
            }

            Logger.debug(`Order formatted: ${JSON.stringify(order, null, 2)}`)

            if (lastWorkBackup.price !== price) {
                Logger.debug(`WARN: prices have diverged when bot wanted to buy.`)
                Logger.debug(`Bot buy price desired: ${lastWorkBackup.price}`)
                Logger.debug(`Real order price: ${price} ${this.quoteCurrency}`)
            }

            this.lastBuyTrade = {
                price,
                time: lastWorkBackup.time,
                benefits: -fundsUsed,
                fees,
                type: TradeType.BUY,
                quantity: order.executedQuantity
            }

            this.actionsPostBuyTrade()

            Logger.debug(`
             ____ ____ ____ 
            ||B |||U |||Y ||
            ||__|||__|||__||
            |/__\\|/__\\|/__\\|            
            
            `)
            Logger.debug(`Last buy trade: ${JSON.stringify(this.lastBuyTrade, null, 2)}`)
            Logger.debug(`Would be able to sell when the price will be above ${Equation.thresholdPriceOfProfitability(this.lastBuyTrade.price).toFixed(8)}${this.quoteCurrency}`)
            Logger.debug(`Funds desired to invest: ${funds}${this.quoteCurrency}`)
            Logger.debug(`Funds really invested: ${fundsUsed}${this.quoteCurrency}`)
        } catch (error) {
            Logger.error(`Error when trying to buy: ${JSON.stringify(error, null, 2)}`)
            this.stop()
        }
    }

    async sell(size: number, partial?: boolean) {
        try {
            if (!Number.isFinite(size)) {
                throw new Error(`Cannot sell, funds are invalid: ${size}`)
            }

            // do not check last trade type, because trader might wants to sell only a part on the quantity, and sell the rest later

            Logger.debug(`Trying to sell ${size} ${this.baseCurrency}`)
            Logger.debug('Sending order to the market...')

            this.state = TraderState.WAITING_FOR_API_RESPONSE

            const lastWorkBackup = { ...this.lastWork }

            const order = await this.market.orders.sellMarket(this.market.currency, size, lastWorkBackup.price)
            const price = order.price || lastWorkBackup.price
            const fees = (price * order.executedQuantity) * config.market.orderFees
            const quoteCurrencyQuantity = (price * order.executedQuantity) - fees

            if (config.api.sandbox) {
                this.quoteCurrencyBalance += quoteCurrencyQuantity
                this.baseCurrencyBalance -= order.executedQuantity
            } else {
                await this.updateBalances()
            }

            Logger.debug(`Order formatted: ${JSON.stringify(order, null, 2)}`)

            if (lastWorkBackup.price !== price) {
                Logger.debug(`WARN: prices have diverged when bot wanted to sell.`)
                Logger.debug(`Bot sell price desired: ${lastWorkBackup.price}`)
                Logger.debug(`Real order price: ${price} ${this.quoteCurrency}`)
            }

            this.lastSellTrade = {
                price,
                time: lastWorkBackup.time,
                benefits: Equation.rateBetweenValues(this.lastBuyTrade.price, price) - (2 * (config.market.orderFees * 100)), // lastBuyTrade is a buy trade, and trade trade have a negative benefits
                fees,
                type: partial ? TradeType.SELL_PARTIAL : TradeType.SELL,
                quantity: order.executedQuantity
            }

            this.actionsPostSellTrade()

            if (partial) {
                this.state = TraderState.WAITING_TO_SELL // Trader sold only a part, he has to sell the rest
            }

            Logger.debug(`
             ____ ____ ____ ____ 
            ||S |||e |||l |||l ||
            ||__|||__|||__|||__||
            |/__\\|/__\\|/__\\|/__\\|
            
            `)
            Logger.debug(`Last trade: ${JSON.stringify(this.lastSellTrade, null, 2)}`)
        } catch (error) {
            Logger.error(`Error when trying to sell: ${error}`)
            this.stop()
        }
    }

    private actionsPostBuyTrade() {
        this.trades.push({ ...this.lastBuyTrade })
        this.prepareForNewTrade()
        this.state = TraderState.WAITING_TO_SELL
        this.slack.buyMessage()
    }

    private actionsPostSellTrade() {
        this.trades.push({ ...this.lastSellTrade })
        this.prepareForNewTrade()
        this.state = TraderState.WAITING_TO_BUY
        this.slack.sellMessage()
    }

    private getLastWork(): ChartWork {
        if (this.works.length === 0) {
            return null
        }

        const lastWork = { ...this.works[this.works.length - 1] }

        return lastWork
    }

    stop() {
        Logger.warn('Trader has been stopped.')
        this.killWatchers()
    }

    killWatchers() {
        if (this.workObserver) {
            this.workObserver.unsubscribe()
        }
    }

    private worksAreEquals(workA: ChartWork, workB: ChartWork): boolean {
        if (!workA || !workB) {
            return false
        }

        return workA.time === workB.time
    }

    private async loadData() {
        Logger.debug('Loading data from data.json...')

        try {
            const read = promisify(readFile)

            const dataString = await read('./data.json', { encoding: 'utf-8' })

            if (dataString && dataString.length > 0) {
                const data: DataStorage = JSON.parse(dataString)

                this.trades = data.trades
                this.startTime = new Date(data.startTime)
                this.initialBaseCurrencyBalance = data.initialBaseCurrencyBalance
                this.initialQuoteCurrencyBalance = data.initialQuoteCurrencyBalance
                
                const lastTrade = this.trades.length > 0 ? this.trades[this.trades.length - 1] : null
                const restartFromTime = lastTrade ? lastTrade.time : 0

                this.chartWorker.initFromWorks(data.works, restartFromTime)

                if (lastTrade) {
                    this.lastBuyTrade = this.findLastBuyTrade(this.trades)
                    this.lastSellTrade = this.findLastSellTrade(this.trades)

                    if (TradeType.BUY === lastTrade.type || TradeType.SELL_PARTIAL === lastTrade.type) {
                        this.state = TraderState.WAITING_TO_SELL
                    } else {
                        this.state = TraderState.WAITING_TO_BUY
                    }

                    Logger.debug(`Starting from a previous trade: ${JSON.stringify(lastTrade, null, 2)}`)
                }

                Logger.debug('Data loaded.')
            }
        } catch (error) {
            Logger.debug('File data.json does not exist or contains invalid json')
        }

        if (!this.lastBuyTrade && !this.lastSellTrade) {
            Logger.debug('\nNo old trades found, starting from scratch.\n')
        }
    }

    private findLastBuyTrade(trades: Trade[]): Trade {
        return trades.slice().reverse().find(trade => trade.type === TradeType.BUY)
    }

    private findLastSellTrade(trades: Trade[]): Trade {
        return trades.slice().reverse().find(trade => trade.type === TradeType.SELL || trade.type === TradeType.SELL_PARTIAL)
    }

    private async persistData() {
        try {
            const write = promisify(writeFile)

            await write('./data.json', JSON.stringify(this.forgeData(), null, 2), { encoding: 'utf-8' })
        } catch (error) {
            Logger.error('\nError when trying to persist data.\n')
            Logger.error(error)
        }
    }

    private forgeData(): DataStorage {
        return {
            works: this.chartWorker.allWorks,
            worksSmoothed: this.chartWorker.filterNoise(this.chartWorker.copyWorks(this.chartWorker.allWorks)),
            trades: this.trades,
            nextMinProfitablePrice: this.state === TraderState.WAITING_TO_SELL ? Equation.thresholdPriceOfProfitability(this.lastBuyTrade.price) : null,
            nextMaxProfitablePrice: this.state === TraderState.WAITING_TO_SELL ? Equation.maxThresholdPriceOfProfitability(this.lastBuyTrade.price) : null,
            baseCurrency: this.baseCurrency,
            baseCurrencyBalance: this.baseCurrencyBalance,
            initialBaseCurrencyBalance: this.initialBaseCurrencyBalance,
            quoteCurrency: this.quoteCurrency,
            quoteCurrencyBalance: this.quoteCurrencyBalance,
            initialQuoteCurrencyBalance: this.initialQuoteCurrencyBalance,
            startTime: this.startTime
        }
    }
}

export default Trader