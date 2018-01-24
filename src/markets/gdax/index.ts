import * as Gdax from 'gdax';
import config from '../../config';
import { Subscription } from 'rxjs/Subscription';
import { Currency } from '../../vendor/interfaces/currency.enum';
import Market from '../../vendor/interfaces/market';
import Orders from '../../vendor/market/orders';
import Accounts from '../../vendor/market/accounts';
import { Subject } from 'rxjs/Subject';
import Logger from '../../vendor/logger/index';

class GdaxService implements Market {
    currency: Currency
    orders: Orders
    accounts: Accounts
    publicClient: Gdax.PublicClient
    client: Gdax.AuthenticatedClient
    socket: Gdax.WebsocketClient
    channels: string[]
    price$: Subject<number>
    lastPrice: number
    price: number
    sandbox: boolean
    lastTicker: Gdax.ProductTicker
    initialized: boolean

    constructor(currency = Currency.BTC_EUR, channels = ['ticker'], sandbox = false) {
        this.currency = currency
        this.channels = channels
        this.sandbox = sandbox
        this.price$ = new Subject()
    }

    async init() {
        const restURI = this.sandbox ? config.api.sandboxURI : config.api.uri
        const websocketURI = this.sandbox ? config.api.websocketURI : config.api.sandboxWebsocketURI
        const websocketAuth = this.sandbox ? null : {
            key: config.api.key,
            secret: config.api.secret,
            passphrase: config.api.passphrase
        }

        this.publicClient = new Gdax.PublicClient(restURI)
        this.client = new Gdax.AuthenticatedClient(config.api.key, config.api.secret, config.api.passphrase, restURI)
        this.socket = new Gdax.WebsocketClient([this.currency], websocketURI, websocketAuth, { channels: this.channels })
        this.orders = new Orders(this.client, this.publicClient)
        this.accounts = new Accounts(this.client)
        
        this.listenSocketErrors()
        this.initialized = true
    }

    watchCurrencyPrice() {
        if (!this.initialized) {
            throw new Error('Gdax market watchCurrencyPrice() cannot be used without being initialized')
        }

        this.socket.on('message', (data: any) => {
            if (data && 'ticker' === data.type) {
                if (Number.isFinite(this.price)) {
                    this.lastPrice = this.price    
                }

                this.price = parseFloat(data.price)
                this.price$.next(this.price)
            }
        })
    }

    async getCurrencyPrice() {
        if (!this.initialized) {
            throw new Error('Gdax market getCurrencyPrice() cannot be used without being initialized')
        }

        this.lastTicker = await this.publicClient.getProductTicker(this.currency)

        return parseFloat(this.lastTicker.price)
    }

    private listenSocketErrors() {
        this.socket.on('error', error => Logger.error(`A socket error occurs: ${error}`))
    }
}

export default GdaxService