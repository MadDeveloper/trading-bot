import Accounts from '../market/accounts';
import ChartWorker from '../chart/chart-worker';
import config from '../../config';
import Market from '../interfaces/market';
import Order from '../interfaces/order';
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

class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker
    workObserver: Subscription
    worksStored: ChartWork[]
    state: TraderState
    chartAnalyzer: ChartAnalyzer
    fiatCurrencyAmountAvailable: number // €, $, £, etc.
    currencyAmountAvailable: number // BTC, ETH, LTC, etc.

    trades: Trade[]
    lastTrade: Trade

    private priceObserver: Subscription

    constructor(market: Market) {
        this.market = market
        this.accounts = market.accounts
        this.chartWorker = new ChartWorker(market)
        this.worksStored = []
        this.trades = []
        this.state = TraderState.WAITING_TO_BUY
        this.chartAnalyzer = new ChartAnalyzer(this.chartWorker)
        this.fiatCurrencyAmountAvailable = 100
        this.trades = []
    }

    async trade() {
        if (!this.market.currency) {
            console.error('Currency is not set, stopping trading.')
            this.stop()
        }

        // this.watchChartWorker()
        // this.chartWorker.workOnPriceTicker()

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

        // console.log(this.chartAnalyzer.containsHollow(worksContainingHollow))
        // console.log(this.chartAnalyzer.containsBump(worksContainingBump))
    }

    async watchChartWorker() {
        this.workObserver = this.chartWorker.work$.subscribe((work: ChartWork) => {
            this.analyzeWorks()
        })
    }

    analyzeWorks() {
        const works = this.chartWorker.filterNoise(this.chartWorker.copyWorks())

        console.log('\nWe are analyzing the chart...')

        if (TraderState.WAITING_TO_BUY === this.state) {
            console.log('Trader wants to buy...')

            /*
             * Trader is waiting to buy
             * we will try to know if we are in a hollow case
             */
            if (this.chartAnalyzer.containsHollow(works)) {
                console.log('hollow detected!')
                /*
                 * We found a hollow, do we have already sold?
                 * If yes: we will buy only if the price is under the last sell price (we want a negative enough pct difference)
                 * If no: we can just buy at the current price
                 */
                if (!this.lastTrade || Number.isFinite(this.lastTrade.price)) {
                    console.log('we are going to buy!')
                    // We have sold, and the current price is below since the last price we sold so we can buy
                    this.buy(this.fiatCurrencyAmountAvailable)
                } else {
                    console.log(`Not bought! Error occured with last trade: ${JSON.stringify(this.lastTrade)}`)
                }

                // Hollow was not enough down in order to buy, but we clear works in order to avoid to loop through it later in analyzer
                this.prepareForNewTrade()
            } else {
                console.log('waiting for an hollow...')
            }
        } else if (TraderState.WAITING_TO_SELL === this.state) {
            console.log('Trader wants to sell...')
            /*
             * Trader is waiting to sell
             * we will try to know if we are in a bump case
             */
            if (this.chartAnalyzer.containsBump(works)) {
                console.log('Bump detected!')
                /*
                 * We found a bump, do we have already bought?
                 * If yes: we will buy only if the price is under the last sell price
                 * If no: we do nothing, we wait an hollow to buy first
                 */
                if (this.lastTrade && Number.isFinite(this.lastTrade.price) && this.isProfitable(this.lastTrade.price, this.chartWorker.lastPrice)) {
                    console.log('we will sell!')
                    this.sell(this.currencyAmountAvailable)
                } else {
                    console.log('Not sold! Was not profitable')
                }

                // Bump was not enough up in order to sell, but we clear works in order to avoid to loop through it later in analyzer
                this.prepareForNewTrade()
            } else {
                console.log('waiting for a bump...')
            }
        } else {
            console.error(`Trader.state does not match any action: ${this.state}`)
            this.stop() // No action to be done, trader is maybe crashed, need external intervention
        }
    }

    isProfitable(priceA, priceB) {
        const multiplierFeesIncluded = 1 - config.market.instantOrderFees

        // a = 0.9975^2 * a * (p2/p1)
        // b > a <=> p2 > p1 / 0.9975^2
        return priceB > (priceA / (Math.pow(multiplierFeesIncluded, 2)))
    }

    prepareForNewTrade() {
        this.chartWorker.clearWorks()
    }

    async buy(funds: number) {
        try {
            if (!Number.isFinite(funds)) {
                throw new Error(`Cannot buy, funds are invalid: ${funds}`)
            }

            const lastWork = Object.assign({}, this.chartWorker.lastWork)

            this.state = TraderState.WAITING_TO_SELL
            this.lastTrade = {
                price: lastWork.price,
                time: lastWork.time,
                benefits: -funds,
                type: TradeType.BUY,
                quantity: funds / lastWork.price
            }

            this.trades.push({ ... this.lastTrade })

            console.log(`Bought! Last trade: ${JSON.stringify(this.lastTrade, null, 2)}`)

            // await this
            //     .market
            //     .orders
            //     .buyMarket(this.market.currency, funds)

            // // TODO: check order book ou nos open orders pour savoir quand l'ordre est fini
            // // récupérer nos comptes pour savoir combien on a en crypto currency et en fiat currency (les amount)
            // this.fiatCurrencyAmountAvailable = this.fiatCurrencyAmountAvailable - funds
            // this.currencyAmountAvailable = this.currencyAmountAvailable + (funds / this.chartWorker.lastPrice)
        } catch (error) {
            console.error(`Error when trying to buy: ${error}`)
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

            const lastWork = Object.assign({}, this.chartWorker.lastWork)

            this.state = TraderState.WAITING_TO_BUY
            this.lastTrade = {
                price: this.chartWorker.lastPrice,
                time: lastWork.time,
                benefits: (this.chartWorker.lastPrice * funds) - (this.lastTrade.quantity * this.lastTrade.price),
                type: TradeType.SELL,
                quantity: funds
            }

            this.trades.push({ ...this.lastTrade })

            console.log(`Sold! Last trade: ${this.lastTrade}`)

            // await this
            //     .market
            //     .orders
            //     .sellMarket(this.market.currency, funds)

            // // TODO: check order book ou nos open orders pour savoir quand l'ordre est fini
            // // récupérer nos comptes pour savoir combien on a en crypto currency et en fiat currency (les amount)
            // this.fiatCurrencyAmountAvailable = this.fiatCurrencyAmountAvailable + (funds * this.chartWorker.lastPrice)
            // this.currencyAmountAvailable = this.currencyAmountAvailable - funds
        } catch (error) {
            console.error(`Error when trying to sell: ${error}`)
        }
    }

    async cancel(order: Order) {
        try {
            await this
                .market
                .orders
                .cancel(order)
        } catch (error) {
            console.error(`Error when trying to cancel order: ${error}`)
        }
    }

    stop() {
        console.warn('Trader has been stopped.')
        this.killWatchers()
    }

    killWatchers() {
        if (this.priceObserver) {
            this.priceObserver.unsubscribe()
        }

        if (this.workObserver) {
            this.workObserver.unsubscribe()
        }
    }

    getDebug() {
        return {
            allWorksStored: this.chartWorker.allWorks,
            allWorksSmoothed: this.chartWorker.filterNoise(this.chartWorker.allWorks),
            trades: this.trades
        }
    }
}

export default Trader