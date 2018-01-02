import Market from '../interfaces/market';
import Trading from '../interfaces/trader'
import { Subscription } from 'rxjs/Subscription'
import Order from '../interfaces/order';

class Trader implements Trading {
    market: Market

    private priceObserver: Subscription

    constructor(market: Market) {
        this.market = market
    }

    async trade() {
        if (!this.market.currency) {
            throw new Error('Currency is not set, stopping trading.')
        }

        this.watchMarketPrice()
    }

    watchMarketPrice() {
        this.market.watchCurrencyPrice()
        this.priceObserver = this
            .market
            .price$
            .subscribe(price => {
                if (null !== price) {
                    console.log(`BTC: ${price}€`)
                }
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
                .sell(this.market.currency, 1, 100)
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