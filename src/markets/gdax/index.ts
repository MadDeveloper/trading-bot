import * as Gdax from 'gdax';
import config from '../../config';
import { Subscription } from 'rxjs/Subscription';
import { Currency } from '../../vendor/interfaces/currency.enum';
import Market from '../../vendor/interfaces/market';
import { BehaviorSubject } from 'rxjs';
import Orders from '../../vendor/market/orders';

class GdaxService implements Market {
    currency: Currency
    orders: Orders
    publicClient: Gdax.PublicClient
    client: Gdax.AuthenticatedClient
    socket: Gdax.WebsocketClient
    channels: string[]
    price$: BehaviorSubject<number> = new BehaviorSubject(null)
    lastPrice: number

    constructor(currency = Currency.BTC_EUR, channels = ['ticker']) {
        this.channels = ['ticker']
        this.currency = currency
        this.publicClient = new Gdax.PublicClient(config.api.uri)
        this.client = new Gdax.AuthenticatedClient(config.api.key, config.api.secret, config.api.passphrase, config.api.uri)
        this.socket = new Gdax.WebsocketClient([currency], config.api.websocketURI, {
            key: config.api.key,
            secret: config.api.secret,
            passphrase: config.api.passphrase
        }, { channels: this.channels })

        this.listenSocketErrors()
        this.orders = new Orders(this.client, this.publicClient)
    }

    watchCurrencyPrice() {
        this.socket.on('message', (data: any) => {
            if (data && 'ticker' === data.type) {
                const price = parseFloat(data.price)

                this.lastPrice = price
                this.price$.next(price)
            }
        })
    }

    private listenSocketErrors() {
        this.socket.on('error', error => console.error(`A socket error occurs: ${error}`))
    }
}

export default GdaxService