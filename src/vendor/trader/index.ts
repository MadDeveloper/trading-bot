import Market from '../interfaces/market';
import Trading from '../interfaces/trader'
import { Subscription } from 'rxjs/Subscription'
import Order from '../interfaces/order';
import Accounts from '../market/accounts';
import { Currency } from '../interfaces/currency.enum';
import config from '../../config';
import ChartWorker from '../chart/chart-worker';
import { Trend } from '../chart/trend.enum';
import { ChartWork } from '../chart/chart-work';

class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker
    trendObserver: Subscription
    lastPrice: number
    currentPrice: number
    lastBuyPrice: number
    lastSellPrice: number
    currentTrend: Trend
    lastTrend: Trend

    private priceObserver: Subscription

    constructor(market: Market) {
        this.market = market
        this.accounts = market.accounts
        this.chartWorker = new ChartWorker(market)
    }

    async trade() {
        if (!this.market.currency) {
            throw new Error('Currency is not set, stopping trading.')
        }

        this.watchChartWorker()
        this.chartWorker.workOnPriceTicker()
    }

    async watchChartWorker() {
        this.trendObserver = this.chartWorker.work$.subscribe((work: ChartWork) => {
            console.log(work)
        })
    }

    async buy() {
        try {
            await this
                .market
                .orders
                .buy(this.market.currency, 1, 100)
        } catch (error) {
            console.error(`Error when trying to buy: ${error}`)
        }
    }

    async sell() {
        try {
            await this
                .market
                .orders
                .sellLimit(this.market.currency, 1, 100)
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
        this.killWatchers()
    }

    killWatchers() {
        if (this.priceObserver) {
            this.priceObserver.unsubscribe()
        }

        if (this.trendObserver) {
            this.trendObserver.unsubscribe()
        }
    }
}

export default Trader