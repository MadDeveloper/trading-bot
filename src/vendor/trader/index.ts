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

class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker
    workObserver: Subscription
    lastBuyPrice: number
    lastSellPrice: number
    worksStored: ChartWork[]
    state: TraderState
    chartAnalyzer: ChartAnalyzer
    fiatCurrencyAmountAvailable: number // €, $, £, etc.
    currencyAmountAvailable: number // BTC, ETH, LTC, etc.

    // Debug properties
    allWorksStored: ChartWork[]
    tradingActionsWork: ChartWork[]

    private priceObserver: Subscription

    constructor(market: Market) {
        this.market = market
        this.accounts = market.accounts
        this.chartWorker = new ChartWorker(market)
        this.worksStored = []
        this.allWorksStored = []
        this.tradingActionsWork = []
        this.state = TraderState.WAITING_TO_BUY
        this.chartAnalyzer = new ChartAnalyzer()
        this.fiatCurrencyAmountAvailable = 100
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
                lastPrice: 1,
                lastTrend: Trend.DOWNWARD,
                price: .9,
                trend: Trend.DOWNWARD,
                time: 0
            },
            {
                lastPrice: .9,
                lastTrend: Trend.DOWNWARD,
                price: .8,
                trend: Trend.DOWNWARD,
                time: 1000
            },
            {
                lastPrice: .8,
                lastTrend: Trend.DOWNWARD,
                price: .8,
                trend: Trend.FLAT,
                time: 2000
            },
            {
                lastPrice: .8,
                lastTrend: Trend.FLAT,
                price: .9,
                trend: Trend.UPWARD,
                time: 3000
            },
            {
                lastPrice: .9,
                lastTrend: Trend.UPWARD,
                price: 1,
                trend: Trend.UPWARD,
                time: 4000
            },
            {
                lastPrice: 1,
                lastTrend: Trend.UPWARD,
                price: 1.1,
                trend: Trend.UPWARD,
                time: 5000
            }
        ]
        const worksContainingBump: ChartWork[] = [
            {
                lastPrice: 1,
                lastTrend: Trend.UPWARD,
                price: 1.1,
                trend: Trend.UPWARD,
                time: 0
            },
            {
                lastPrice: 1.1,
                lastTrend: Trend.UPWARD,
                price: 1.2,
                trend: Trend.UPWARD,
                time: 1000
            },
            {
                lastPrice: 1.2,
                lastTrend: Trend.DOWNWARD,
                price: 1.2,
                trend: Trend.FLAT,
                time: 2000
            },
            {
                lastPrice: 1.2,
                lastTrend: Trend.FLAT,
                price: 1.1,
                trend: Trend.DOWNWARD,
                time: 3000
            },
            {
                lastPrice: 1.1,
                lastTrend: Trend.DOWNWARD,
                price: 1,
                trend: Trend.DOWNWARD,
                time: 4000
            },
            {
                lastPrice: 1,
                lastTrend: Trend.DOWNWARD,
                price: .9,
                trend: Trend.DOWNWARD,
                time: 5000
            }
        ]

        // console.log(this.chartAnalyzer.containsHollow(worksContainingHollow))
        // console.log(this.chartAnalyzer.containsBump(worksContainingBump))
    }

    async watchChartWorker() {
        this.workObserver = this.chartWorker.work$.subscribe((work: ChartWork) => {
            this.worksStored.push(work)
            this.allWorksStored.push(work)
            this.analyzeWorks()
        })
    }

    analyzeWorks() {
        const lastPrice = this.chartWorker.lastPrice
        const thresholdDifferenceBetweenPrice = config.trader.thresholdDifferenceBetweenLastSellPrieAndNewBuyPrice

        console.log('on Analyse le travail')

        if (TraderState.WAITING_TO_BUY === this.state) {
            /*
             * Trader is waiting to buy
             * we will try to know if we are in a hollow case
             */
            if (this.chartAnalyzer.containsHollow(this.worksStored)) {
                /*
                 * We found a hollow, do we have already sold?
                 * If yes: we will buy only if the price is under the last sell price (we want a negative enough pct difference)
                 * If no: we can just buy at the current price
                 */
                if (!Number.isFinite(this.lastSellPrice) || (Number.isFinite(this.lastSellPrice) && this.differenceBetweenPricePct(this.lastSellPrice, lastPrice) < -thresholdDifferenceBetweenPrice)) {
                    // We have sold, and the current price is below since the last price we sold so we can buy
                    this.buy(this.fiatCurrencyAmountAvailable)
                    this.clearWorks()
                }
            }
        } else if (TraderState.WAITING_TO_SELL === this.state) {
            /*
             * Trader is waiting to sell
             * we will try to know if we are in a bump case
             */
            if (this.chartAnalyzer.containsBump(this.worksStored)) {
                /*
                 * We found a bump, do we have already bought?
                 * If yes: we will buy only if the price is under the last sell price
                 * If no: we do nothing, we wait an hollow to buy first
                 */
                if (Number.isFinite(this.lastBuyPrice) && this.isProfitable(this.lastBuyPrice, this.chartWorker.lastPrice)) {
                    this.sell(this.currencyAmountAvailable)
                    this.clearWorks()
                }
            }
        } else {
            console.error(`Trader.state does not match any action: ${this.state}`)
            this.stop() // No action to be done, trader is maybe crashed, need external intervention
        }
    }

    differenceBetweenPricePct(priceA, priceB): number {
        return 100 * ((priceB / priceA) - 1) // from: a * (1 + t/100) = b <=> t = 100(b/a - 1)
    }

    isProfitable(priceA, priceB) {
        const multiplierFeesIncluded = 1 - config.market.instantOrderFees

        // a = 0.9975^2 * a * (p2/p1)
        // b > a <=> p2 > p1 / 0.9975^2
        return priceB > (priceA / (Math.pow(multiplierFeesIncluded, 2)))
    }

    clearWorks() {
        this.worksStored = []
    }

    async buy(funds: number) {
        try {
            if (!Number.isFinite(funds)) {
                throw new Error(`Cannot buy, funds are invalid: ${funds}`)
            }

            console.log(`on achète au prix de ${this.chartWorker.lastPrice}`)
            this.state = TraderState.WAITING_TO_SELL
            this.lastSellPrice = this.chartWorker.lastPrice
            this.tradingActionsWork.push(this.allWorksStored[this.allWorksStored.length - 1])

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

            console.log(`on vend au prix de ${this.chartWorker.lastPrice}`)
            this.state = TraderState.WAITING_TO_BUY
            this.lastBuyPrice = this.chartWorker.lastPrice
            this.tradingActionsWork.push(this.allWorksStored[this.allWorksStored.length - 1])

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

    logDebug() {
        console.log('Trader work retrieved:')
        console.log(this.allWorksStored)
        console.log(this.tradingActionsWork)
    }

    getDebug() {
        return {
            allWorkdsStored: this.allWorksStored,
            tradingActionsWork: this.tradingActionsWork
        }
    }
}

export default Trader