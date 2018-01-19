import Market from '../interfaces/market';
import Trading from '../interfaces/trader'
import { Subscription } from 'rxjs/Subscription'
import Order from '../interfaces/order';
import Accounts from '../market/accounts';
import { Currency } from '../interfaces/currency.enum';
import config from '../../config';
import ChartWorker from '../chart/chart-worker';

class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker

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

        // this.watchMarketPrice()
        this.chartWorker.workOnPriceTicker()
    }

    async watchMarketPrice() {
        // this.market.watchCurrencyPrice()
        // this.priceObserver = this
        //     .market
        //     .price$
        //     .subscribe(async price => {
        //         if (null !== price) {
        //             console.log(`BTC: ${price}€`)
        //         }
        //     })

        

        // console.log(await this.accounts.accounts())
        // const paymentMethod = await this.accounts.paymentMethodByCurrency(Currency.EUR)
        // console.log(await this.accounts.deposit(100, paymentMethod))
        // console.log(await this.accounts.accounts())
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
    }
}

export default Trader