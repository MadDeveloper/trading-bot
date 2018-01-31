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

class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker
    workObserver: Subscription
    state: TraderState
    chartAnalyzer: ChartAnalyzer
    quoteCurrency: Currency
    quoteCurrencyBalance: number // €, $, £, etc.
    baseCurrency: Currency
    baseCurrencyBalance: number // BTC, ETH, LTC, etc.

    trades: Trade[]
    lastTrade: Trade

    private works: ChartWork[]
    private lastWork: ChartWork

    constructor(market: Market) {
        this.market = market
        this.accounts = market.accounts
        this.chartWorker = new ChartWorker(market)
        this.works = []
        this.lastWork = null
        this.trades = []
        this.state = TraderState.WAITING_TO_BUY
        this.chartAnalyzer = new ChartAnalyzer(this.chartWorker)

        // Currencies
        this.quoteCurrency = config.account.quoteCurrency
        this.quoteCurrencyBalance = 0
        this.baseCurrency = config.account.baseCurrency
        this.baseCurrencyBalance = 0
    }

    async updateBalances() {
        this.quoteCurrencyBalance = await this.accounts.availableFunds(this.quoteCurrency)
        this.baseCurrencyBalance = await this.accounts.availableFunds(this.baseCurrency)
    }

    async trade() {
        if (!this.market.currency) {
            Logger.error('Currency is not set, stopping trading.')
            this.stop()

            return
        }

        try {
            await this.loadTrades()
            await this.updateBalances()

            Logger.debug('\nBalances:')
            Logger.debug(`    ${this.quoteCurrency}: ${this.quoteCurrencyBalance}`)
            Logger.debug(`    ${this.baseCurrency}: ${this.baseCurrencyBalance}\n`)
        } catch (error) {
            Logger.error(`Fatal error occured while trying to retrieve account balances: ${error}`)

            return
        }

        this.watchChartWorker()
        this.chartWorker.startWorking()

        // FOLLOWING LINES ARE FOR DEBUG ONLY
        const worksContainingHollow: ChartWork[] = [
            {
                "id": 7,
                "lastPrice": 8447.48,
                "price": 8450.8,
                "lastTrend": 1,
                "trend": 0,
                "time": 105000
            },
            {
                "id": 9,
                "lastPrice": 8450.8,
                "price": 8463.38,
                "lastTrend": 0,
                "trend": 0,
                "time": 135000
            },
            {
                "id": 10,
                "lastPrice": 8463.38,
                "price": 8459.55,
                "lastTrend": 0,
                "trend": 1,
                "time": 150000
            },
            {
                "id": 14,
                "lastPrice": 8459.55,
                "price": 8436.69,
                "lastTrend": 1,
                "trend": 1,
                "time": 210000
            },
            {
                "id": 20,
                "lastPrice": 8436.69,
                "price": 8477,
                "lastTrend": 1,
                "trend": 0,
                "time": 300000
            },
            {
                "id": 23,
                "lastPrice": 8477,
                "price": 8478.31,
                "lastTrend": 0,
                "trend": 0,
                "time": 345000
            },
            {
                "id": 26,
                "lastPrice": 8478.31,
                "price": 8477.05,
                "lastTrend": 0,
                "trend": 1,
                "time": 390000
            }
        ]
        const worksContainingBump: ChartWork[] = [
            {
                "id": 38,
                "lastPrice": 8478.31,
                "price": 8477.01,
                "lastTrend": 0,
                "trend": 1,
                "time": 570000
            },
            {
                "id": 49,
                "lastPrice": 8477.01,
                "price": 8478.31,
                "lastTrend": 1,
                "trend": 0,
                "time": 735000
            },
            {
                "id": 50,
                "lastPrice": 8478.31,
                "price": 8488,
                "lastTrend": 0,
                "trend": 0,
                "time": 750000
            },
            {
                "id": 51,
                "lastPrice": 8488,
                "price": 8492.27,
                "lastTrend": 0,
                "trend": 0,
                "time": 765000
            },
            {
                "id": 52,
                "lastPrice": 8492.27,
                "price": 8523.51,
                "lastTrend": 0,
                "trend": 0,
                "time": 780000
            },
            {
                "id": 54,
                "lastPrice": 8523.51,
                "price": 8531.42,
                "lastTrend": 0,
                "trend": 0,
                "time": 810000
            },
            {
                "id": 56,
                "lastPrice": 8531.42,
                "price": 8537.28,
                "lastTrend": 0,
                "trend": 0,
                "time": 840000
            },
            {
                "id": 61,
                "lastPrice": 8537.28,
                "price": 8538,
                "lastTrend": 0,
                "trend": 0,
                "time": 915000
            },
            {
                "id": 65,
                "lastPrice": 8538,
                "price": 8535.97,
                "lastTrend": 0,
                "trend": 1,
                "time": 975000
            },
            {
                "id": 66,
                "lastPrice": 8535.97,
                "price": 8532.42,
                "lastTrend": 1,
                "trend": 1,
                "time": 990000
            },
            {
                "id": 69,
                "lastPrice": 8532.42,
                "price": 8535.89,
                "lastTrend": 1,
                "trend": 0,
                "time": 1035000
            },
            {
                "id": 76,
                "lastPrice": 8535.89,
                "price": 8538.2,
                "lastTrend": 0,
                "trend": 0,
                "time": 1140000
            }
        ]

        // this.chartWorker.works = worksContainingHollow
        // Logger.debug(this.chartAnalyzer.detectHollow(worksContainingHollow))

        // this.chartWorker.works = worksContainingBump
        // Logger.debug(this.chartAnalyzer.detectBump(worksContainingBump))
    }

    async watchChartWorker() {
        this.workObserver = this.chartWorker.work$.subscribe((work: ChartWork) => {
            this.works = this.chartWorker.filterNoise(this.chartWorker.copyWorks())

            const newLastWork = { ...this.works[this.works.length - 1] }

            Logger.debug(`\nPrice: ${newLastWork.price}${this.quoteCurrency}`)

            if (!this.worksAreEquals(newLastWork, this.lastWork)) {
                this.lastWork = newLastWork
                this.analyzeWorks()
            } else {
                Logger.debug('\nLast price does not need analyze')
            }

            if (config.app.debug) {
                this.writeDebug()
            }
        })
    }

    async analyzeWorks() {
        Logger.debug('Analyzing chart...')

        if (TraderState.WAITING_TO_BUY === this.state) {
            Logger.debug('Trader wants to buy.')

            /*
             * Trader is waiting to buy
             * we will try to know if we are in a hollow case
             */
            if (this.chartAnalyzer.detectHollow(this.works)) {
                Logger.debug('Hollow detected!')
                /*
                 * We found a hollow, do we have already sold?
                 * If yes: we will buy only if the price is under the last sell price (we want a negative enough pct difference)
                 * If no: we can just buy at the current price
                 */
                if (!this.lastTrade || Number.isFinite(this.lastTrade.price)) {
                    const funds = this.fundsToUse()

                    Logger.debug(`Trader is buying at ${this.lastWork.price}`)

                    // We have sold, and the current price is below since the last price we sold so we can buy
                    this.buy(funds)
                } else {
                    Logger.debug(`Not bought! Error occured with last trade: ${JSON.stringify(this.lastTrade)}`)

                    // Hollow was not enough down in order to buy, but we clear works in order to avoid to loop through it later in analyzer
                    this.prepareForNewTrade()
                }
            } else {
                Logger.debug('Waiting for an hollow...')
            }
        } else if (TraderState.WAITING_TO_SELL === this.state && this.lastTrade && Number.isFinite(this.lastTrade.price)) {
            Logger.debug('Trader wants to sell.')

            let size
            let quoteCurrencyInvested = this.lastTrade.benefits
            let priceToSell = this.lastWork.price

            try {
                size = this.market.orders.normalizeQuantity(this.sizeToUse())
            } catch (error) {
                Logger.error(error)
                this.stop()

                return
            }

            // Fast mode
            if (!config.trader.sellWhenPriceExceedsThresholdOfProfitability && !this.chartWorker.isInFastMode() && this.chartAnalyzer.detectProfitablePump(this.works, this.lastTrade.price)) {
                /*
                 * Detect pump which can be profitable to sell in
                 * We accelerate the ticker interval until we try to sell
                 */
                Logger.debug('Fast mode activated')
                this.chartWorker.fastMode()
            }

            // Strategies
            if (config.trader.sellWhenPriceExceedsThresholdOfProfitability && this.lastWork.price > Equation.thresholdPriceOfProbitability(this.lastTrade.price)) {
                /*
                 * Option sellWhenPriceExceedsThresholdOfProfitability is activated
                 * So, we sell because de price exceeds the threshold of profitability
                 */
                Logger.debug('Threshold of profitability reached')
                Logger.debug(`Trader is selling at ${this.lastWork.price}`)
                this.sell(size)
            } else if (config.trader.useExitStrategyInCaseOfLosses && Equation.rateBetweenValues(this.lastTrade.price, this.lastWork.price) < -config.trader.sellWhenLossRateReaches) {
                /*
                 * Option useExitStrategyInCaseOfLosses is activated
                 * So, we sell because the loss is below the limit we fixed
                 */
                Logger.debug('Threshold of loss rate reached')
                Logger.debug(`Trader is selling at ${this.lastWork.price}`)
                this.sell(size)
            } else if (!config.trader.sellWhenPriceExceedsThresholdOfProfitability && this.chartAnalyzer.detectBump(this.works)) {
                /*
                 * We found a bump, do we have already bought?
                 * If yes: we will buy only if the price is under the last sell price
                 * If no: we do nothing, we wait an hollow to buy first
                 */
                Logger.debug('Bump detected!')

                if (Equation.isProfitable(this.lastTrade.price, this.lastWork.price) /*&& Equation.isProfitableOnQuantity(quoteCurrencyInvested, size, priceToSell)*/) {
                    Logger.debug(`Trader is selling at ${this.lastWork.price}`)
                    this.sell(size)
                } else {
                    Logger.debug('Not sold! Was not profitable')

                    // Bump was not enough up in order to sell, but we clear works in order to avoid to loop through it later in analyzer
                    this.prepareForNewTrade()
                }
            } else {
                Logger.debug('No defined strategies detected. Waiting for an event...')
            }
        } else {
            Logger.error(`Trader.state does not match any action: ${this.state}`)
            this.stop() // No action to be done, trader is maybe crashed, need external intervention
        }

        Logger.debug('\n----------------------------------------\n')
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
        this.chartWorker.prepareForNewWorks()
    }

    async buy(funds: number) {
        try {
            if (!Number.isFinite(funds)) {
                throw new Error(`Cannot buy, funds are invalid: ${funds}`)
            }

            if (this.lastTrade && this.lastTrade.type !== TradeType.SELL) {
                throw new Error('Trying to buy but last trade is not of type SELL.')
            }

            // Remote work
            const order = await this.market.orders.buyMarket(this.market.currency, funds, this.lastWork.price)

            await this.updateBalances()

            // FIXME: order.price is always 0.00000, need to get FULL response type
            // Local work
            const fundsUsed = this.lastWork.price * order.executedQuantity
            const fees = fundsUsed * config.market.instantOrderFees

            this.state = TraderState.WAITING_TO_SELL
            this.lastTrade = {
                price: this.lastWork.price,
                time: this.lastWork.time,
                benefits: -fundsUsed,
                fees,
                type: TradeType.BUY,
                quantity: order.executedQuantity
            }

            this.actionsPostTrade()

            Logger.debug(`
             ____ ____ ____ 
            ||B |||U |||Y ||
            ||__|||__|||__||
            |/__\\|/__\\|/__\\|            
            
            `)
            Logger.debug(`Last trade: ${JSON.stringify(this.lastTrade, null, 2)}`)
            Logger.debug(`Would be able to sell when the price will be above ${Equation.thresholdPriceOfProbitability(this.lastTrade.price).toFixed(8)}${this.quoteCurrency}`)
            Logger.debug(`Funds desired to invest: ${funds}${this.quoteCurrency}`)
            Logger.debug(`Funds really invested: ${fundsUsed}${this.quoteCurrency}`)
        } catch (error) {
            Logger.error(`Error when trying to buy: ${JSON.stringify(error, null, 2)}`)
            this.stop()
        }
    }

    async sell(size: number) {
        try {
            if (!Number.isFinite(size)) {
                throw new Error(`Cannot sell, funds are invalid: ${size}`)
            }

            if (this.lastTrade.type !== TradeType.BUY) {
                throw new Error('Trying to sell but last trade is not of type BUY.')
            }

            Logger.debug(`Trying to sell ${size} ${this.baseCurrency}`)

            // Remote work
            const order = await this.market.orders.sellMarket(this.market.currency, size, this.lastWork.price)

            await this.updateBalances()

            // FIXME: order.price is always 0.00000, need to get FULL response type
            // Local work
            const fees = (this.lastWork.price * order.executedQuantity) * config.market.instantOrderFees
            const quoteCurrencyQuantity = (this.lastWork.price * order.executedQuantity) - fees

            this.state = TraderState.WAITING_TO_BUY
            this.lastTrade = {
                price: this.lastWork.price,
                time: this.lastWork.time,
                benefits: quoteCurrencyQuantity - Math.abs(this.lastTrade.benefits), // lastTrade is a buy trade, and trade trade have a negative benefits
                fees,
                type: TradeType.SELL,
                quantity: quoteCurrencyQuantity
            }

            this.actionsPostTrade()

            Logger.debug(`
             ____ ____ ____ ____ 
            ||S |||e |||l |||l ||
            ||__|||__|||__|||__||
            |/__\\|/__\\|/__\\|/__\\|
            
            `)
            Logger.debug(`Last trade: ${JSON.stringify(this.lastTrade, null, 2)}`)
        } catch (error) {
            Logger.error(`Error when trying to sell: ${error}`)
            this.stop()
        }
    }

    private actionsPostTrade() {
        this.trades.push({ ...this.lastTrade })
        this.persistTrades()
        this.prepareForNewTrade()
    }

    private getLastWork(): ChartWork {
        // FIXME: may introduces error with price and trend (delayed by one point with lastWork without filtering)
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

    private async loadTrades() {
        try {
            const read = promisify(readFile)

            const data = await read('./trades.json', { encoding: 'utf-8' })

            if (data && data.length > 0) {
                this.trades = JSON.parse(data)

                if (this.trades.length > 0) {
                    this.lastTrade = { ...this.trades[this.trades.length - 1] }
                    this.state = this.lastTrade.type === TradeType.BUY ? TraderState.WAITING_TO_SELL : TraderState.WAITING_TO_BUY

                    Logger.debug(`Starting from a previous trade: ${JSON.stringify(this.lastTrade, null, 2)}`)
                }
            }
        } catch (error) {
            Logger.debug('File trades.json does not exist or contains invalid json')
        }

        if (!this.lastTrade) {
            Logger.debug('\nNo old trades found, starting from scratch.\n')
        }
    }

    private async persistTrades() {
        try {
            const write = promisify(writeFile)

            await write('./trades.json', JSON.stringify(this.trades, null, 2), { encoding: 'utf-8' })
        } catch (error) {
            Logger.error('\nError when trying to persist trades.\n')
            Logger.error(error)
        }
    }

    private worksAreEquals(workA: ChartWork, workB: ChartWork): boolean {
        if (!workA || !workB) {
            return false
        }

        return workA.time === workB.time
    }

    getDebug() {
        return {
            allWorksStored: this.chartWorker.allWorks,
            allWorksSmoothed: this.chartWorker.filterNoise(this.chartWorker.copyWorks(this.chartWorker.allWorks)),
            trades: this.trades,
            baseCurrency: this.baseCurrency,
            baseCurrencyBalance: this.baseCurrencyBalance,
            quoteCurrency: this.quoteCurrency,
            quoteCurrencyBalance: this.quoteCurrencyBalance
        }
    }

    writeDebug() {
        const debug = this.getDebug()

        writeFile('./data.json', JSON.stringify(debug, null, 2), { encoding: 'utf-8' }, error => {
            if (error) {
                Logger.debug('An error occured while trying to write in debug file')
                Logger.debug(error)
            }
        })
    }
}

export default Trader