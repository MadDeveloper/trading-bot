import Market from '../interfaces/market';
import Trading from '../interfaces/trader'
import { Subscription } from 'rxjs/Subscription'
import Order from '../interfaces/order';
import Accounts from '../market/accounts';
import { Currency } from '../interfaces/currency.enum';
import config from '../../config';
import ChartWorker from '../chart/chart-worker';
import { Trend } from '../chart/trend.enum';

class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker
    trendObserver: Subscription

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

        this.market.watchCurrencyPrice()
        this.chartWorker.workOnPriceTicker()
        this.watchTrend()
    }

    async watchMarketPrice() {
        // this.priceObserver = this
        //     .market
        //     .price$
        //     .subscribe(async price => {
        //         console.log(`BTC: ${price}€`)
        //     })

        

        // console.log(await this.accounts.accounts())
        // const paymentMethod = await this.accounts.paymentMethodByCurrency(Currency.EUR)
        // console.log(await this.accounts.deposit(100, paymentMethod))
        // console.log(await this.accounts.accounts())
    }

    async watchTrend() {
        this.trendObserver = this.chartWorker.trend$.subscribe(trend => {
            console.log('current trend', trend)
            console.log('last trend', this.chartWorker.lastTrend)
            switch (trend) {
                case Trend.DOWNWARD:
                    if (this.chartWorker.lastTrend !== trend) {
                        console.log('Tendance a la baisse.')
                    }
                    break;
            
                case Trend.UPWARD:
                    if (this.chartWorker.lastTrend !== trend) {
                        console.log('Tendance a la hausse.')
                    }
                    break;
            }

            console.log(`Ancien prix: ${this.market.lastPrice}, nouveau prix: ${this.market.price}`)
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