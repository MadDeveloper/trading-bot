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

        this.watchChartWorker()
        this.chartWorker.workOnPriceTicker()

        const worksContainingHollow: ChartWork[] = [
            {
                id: 1,
                lastPrice: 1,
                lastTrend: Trend.DOWNWARD,
                price: .9,
                trend: Trend.DOWNWARD,
                time: 0
            },
            {
                id: 2,
                lastPrice: .9,
                lastTrend: Trend.DOWNWARD,
                price: .8,
                trend: Trend.DOWNWARD,
                time: 1000
            },
            {
                id: 3,
                lastPrice: .8,
                lastTrend: Trend.DOWNWARD,
                price: .8,
                trend: Trend.FLAT,
                time: 2000
            },
            {
                id: 4,
                lastPrice: .8,
                lastTrend: Trend.FLAT,
                price: .9,
                trend: Trend.UPWARD,
                time: 3000
            },
            {
                id: 5,
                lastPrice: .9,
                lastTrend: Trend.UPWARD,
                price: 1,
                trend: Trend.UPWARD,
                time: 4000
            },
            {
                id: 6,
                lastPrice: 1,
                lastTrend: Trend.UPWARD,
                price: 1.1,
                trend: Trend.UPWARD,
                time: 5000
            }
        ]
        const worksContainingBump: ChartWork[] = [
            {
                id: 1,
                lastPrice: 1,
                lastTrend: Trend.UPWARD,
                price: 1.1,
                trend: Trend.UPWARD,
                time: 0
            },
            {
                id: 2,
                lastPrice: 1.1,
                lastTrend: Trend.UPWARD,
                price: 1.2,
                trend: Trend.UPWARD,
                time: 1000
            },
            {
                id: 3,
                lastPrice: 1.2,
                lastTrend: Trend.DOWNWARD,
                price: 1.2,
                trend: Trend.FLAT,
                time: 2000
            },
            {
                id: 4,
                lastPrice: 1.2,
                lastTrend: Trend.FLAT,
                price: 1.1,
                trend: Trend.DOWNWARD,
                time: 3000
            },
            {
                id: 5,
                lastPrice: 1.1,
                lastTrend: Trend.DOWNWARD,
                price: 1,
                trend: Trend.DOWNWARD,
                time: 4000
            },
            {
                id: 6,
                lastPrice: 1,
                lastTrend: Trend.DOWNWARD,
                price: .9,
                trend: Trend.DOWNWARD,
                time: 5000
            }
        ]
        
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

            const lastWork = this.chartWorker.lastWork // FIXME: be sure that's the work we want buy on it

            this.state = TraderState.WAITING_TO_SELL
            this.lastTrade = {
                price: lastWork.price,
                time: lastWork.time,
                benefits: -funds,
                type: TradeType.BUY,
                quantity: funds / lastWork.price
            }

            this.trades.push(this.lastTrade)

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

            const lastWork = this.chartWorker.lastWork // FIXME: be sure that's the work we want buy on it

            this.state = TraderState.WAITING_TO_BUY
            this.lastTrade = {
                price: this.chartWorker.lastPrice,
                time: lastWork.time,
                benefits: (this.chartWorker.lastPrice * funds) - (this.lastTrade.quantity * this.lastTrade.price),
                type: TradeType.SELL,
                quantity: funds
            }

            this.trades.push(this.lastTrade)

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