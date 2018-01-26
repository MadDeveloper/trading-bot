import Accounts from '../market/accounts';
import ChartWorker from '../chart/chart-worker';
import config from '../../config';
import Market from '../interfaces/market';
import Trading from '../interfaces/trader';
import { ChartWork } from '../chart/chart-work';
import { Currency } from '../interfaces/currency.enum';
import { Subscription } from 'rxjs/Subscription';
import { TraderState } from './trader-state';
import { Trend } from '../chart/trend.enum';
import ChartAnalyzer from '../chart/chart-analyzer';
import { Trade } from './trade';
import { TradeType } from './trade-type';
import Equation from '../chart/equation';
import { writeFileSync } from 'fs';
import Logger from '../logger/index';
import { OrderResult } from 'gdax';

class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker
    workObserver: Subscription
    worksStored: ChartWork[]
    state: TraderState
    chartAnalyzer: ChartAnalyzer
    quoteCurrency: Currency
    quoteCurrencyBalance: number // €, $, £, etc.
    baseCurrency: Currency
    baseCurrencyBalance: number // BTC, ETH, LTC, etc.

    trades: Trade[]
    lastTrade: Trade

    constructor(market: Market) {
        this.market = market
        this.accounts = market.accounts
        this.chartWorker = new ChartWorker(market)
        this.worksStored = []
        this.trades = []
        this.state = TraderState.WAITING_TO_BUY
        this.chartAnalyzer = new ChartAnalyzer(this.chartWorker)
        this.trades = []

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
            await this.updateBalances()
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

        // Logger.debug(this.chartAnalyzer.containsHollow(worksContainingHollow))
        // Logger.debug(this.chartAnalyzer.containsBump(worksContainingBump))
    }

    async watchChartWorker() {
        this.workObserver = this.chartWorker.work$.subscribe((work: ChartWork) => {
            this.analyzeWorks()

            if (config.app.debug) {
                this.writeDebug()
            }
        })
    }

    async analyzeWorks() {
        const works = this.chartWorker.filterNoise(this.chartWorker.copyWorks())
        const lastWork = this.chartWorker.lastWork

        Logger.debug(`Last price: ${lastWork.price}€`)

        if (TraderState.WAITING_TO_BUY === this.state) {
            Logger.debug('Trader wants to buy...')

            /*
             * Trader is waiting to buy
             * we will try to know if we are in a hollow case
             */
            if (this.chartAnalyzer.detectHollow(works)) {
                Logger.debug('hollow detected!')
                /*
                 * We found a hollow, do we have already sold?
                 * If yes: we will buy only if the price is under the last sell price (we want a negative enough pct difference)
                 * If no: we can just buy at the current price
                 */
                if (!this.lastTrade || Number.isFinite(this.lastTrade.price)) {
                    const funds = this.fundsToUse()

                    Logger.debug(`Trader is buying at ${lastWork.price}`)

                    // We have sold, and the current price is below since the last price we sold so we can buy
                    this.buy(funds)
                } else {
                    Logger.debug(`Not bought! Error occured with last trade: ${JSON.stringify(this.lastTrade)}`)
                }

                // Hollow was not enough down in order to buy, but we clear works in order to avoid to loop through it later in analyzer
                this.prepareForNewTrade()
            } else {
                Logger.debug('waiting for an hollow...')
            }
        } else if (TraderState.WAITING_TO_SELL === this.state) {
            Logger.debug('Trader wants to sell...')
            /*
             * Trader is waiting to sell
             * we will try to know if we are in a bump case
             */
            if (this.chartAnalyzer.detectBump(works)) {
                Logger.debug('Bump detected!')
                /*
                 * We found a bump, do we have already bought?
                 * If yes: we will buy only if the price is under the last sell price
                 * If no: we do nothing, we wait an hollow to buy first
                 */
                if (this.lastTrade && Number.isFinite(this.lastTrade.price) && Equation.isProfitable(this.lastTrade.price, lastWork.price)) {
                    const size = this.sizeToUse()

                    Logger.debug(`Trader is selling at ${lastWork.price}`)
                    this.sell(size)
                } else {
                    Logger.debug('Not sold! Was not profitable')
                }

                // Bump was not enough up in order to sell, but we clear works in order to avoid to loop through it later in analyzer
                this.prepareForNewTrade()
            } else if (!this.chartWorker.isInFastMode() && this.chartAnalyzer.detectProfitablePump(works, this.lastTrade.price)) {
              /*
               * Detect pump which can be profitable to sell in
               * We accelerate the ticker interval until we try to sell
               */
              Logger.debug('Fast mode activated')
              this.chartWorker.fastMode()
            } else {
                Logger.debug('waiting for a bump...')
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
            await this.market.orders.buyMarket(this.market.currency, funds)
            await this.updateBalances()

            // Local work
            const lastWork = Object.assign({}, this.chartWorker.lastWork)
            const fees = funds * config.market.instantOrderFees

            this.state = TraderState.WAITING_TO_SELL
            this.lastTrade = {
                price: lastWork.price,
                time: lastWork.time,
                benefits: -(funds - fees),
                fees,
                type: TradeType.BUY,
                quantity: funds / lastWork.price
            }

            this.trades.push({ ... this.lastTrade })

            Logger.debug(`
             ____ ____ ____ 
            ||B |||U |||Y ||
            ||__|||__|||__||
            |/__\\|/__\\|/__\\|            
            
            `)
            Logger.debug(`Last trade: ${JSON.stringify(this.lastTrade, null, 2)}`)
            Logger.debug(`Would be able to sell when the price will be above ${Equation.thresholdPriceOfProbitability(this.lastTrade.price).toFixed(2)}€`)
        } catch (error) {
            Logger.error(`Error when trying to buy: ${error}`)
        }
    }

    async sell(funds: number) {
        try {
            if (!Number.isFinite(funds)) {
                throw new Error(`Cannot sell, funds are invalid: ${funds}`)
            }

            if (this.lastTrade.type !== TradeType.BUY) {
                throw new Error('Trying to sell but last trade is not of type BUY.')
            }

            Logger.debug(`Trying to sell ${funds} ${this.baseCurrency}`)

            // Remote work
            await this.market.orders.sellMarket(this.market.currency, funds)
            await this.updateBalances()

            const lastWork = Object.assign({}, this.chartWorker.lastWork)
            const fees = (this.lastTrade.quantity * this.lastTrade.price) * config.market.instantOrderFees

            this.state = TraderState.WAITING_TO_BUY
            this.lastTrade = {
                price: lastWork.price,
                time: lastWork.time,
                benefits: (this.chartWorker.lastPrice * funds) - (this.lastTrade.quantity * this.lastTrade.price) - fees,
                fees,
                type: TradeType.SELL,
                quantity: funds
            }

            this.trades.push({ ...this.lastTrade })

            Logger.debug(`
             ____ ____ ____ ____ 
            ||S |||e |||l |||l ||
            ||__|||__|||__|||__||
            |/__\\|/__\\|/__\\|/__\\|
            
            `)
            Logger.debug(`Last trade: ${JSON.stringify(this.lastTrade, null, 2)}`)
        } catch (error) {
            Logger.error(`Error when trying to sell: ${error}`)
        }
    }

    async cancel(order: OrderResult) {
        try {
            await this.market.orders.cancel(order)
        } catch (error) {
            Logger.error(`Error when trying to cancel order: ${error}`)
        }
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

    getDebug() {
        const works = this.chartWorker.allWorks

        return {
            allWorksStored: works,
            allWorksSmoothed: this.chartWorker.filterNoise(works),
            trades: this.trades
        }
    }

    writeDebug() {
        const debug = this.getDebug()

        writeFileSync('./data.json', JSON.stringify(debug, null, 2), { encoding: 'utf-8' })
    }
}

export default Trader