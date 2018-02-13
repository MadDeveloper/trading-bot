import * as Gdax from 'gdax';
import { config } from '../../config';
import { Subscription } from 'rxjs/Subscription';
import { Currency } from '../../vendor/interfaces/currency.enum';
import Market from '../../vendor/interfaces/market';
import Orders from '../../vendor/market/orders';
import { Accounts } from '../../vendor/market/accounts';
import { Subject } from 'rxjs/Subject';
import Logger from '../../vendor/logger/index';
import GdaxAccounts from './accounts';
import GdaxOrders from './orders';

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

    constructor(channels: string[] = ['ticker']) {
        this.currency = config.market.currency
        this.channels = channels
        this.sandbox = config.api.sandbox
        this.price$ = new Subject()
    }

    async init() {
        const restURI = this.sandbox ? config.api.sandboxURI : config.api.uri
        const websocketURI = this.sandbox ? config.api.sandboxWebsocketURI : config.api.websocketURI
        const websocketAuth = this.sandbox ? null : {
            key: process.env.GDAX_API_KEY,
            secret: process.env.GDAX_API_SECRET,
            passphrase: process.env.GDAX_API_PASSPHRASE
        }

        this.publicClient = new Gdax.PublicClient(restURI)
        this.client = new Gdax.AuthenticatedClient(process.env.GDAX_API_KEY, process.env.GDAX_API_SECRET, process.env.GDAX_API_PASSPHRASE, restURI)
        this.socket = new Gdax.WebsocketClient([this.currency], websocketURI, websocketAuth, { channels: this.channels })
        this.orders = new GdaxOrders(this.client, this.publicClient)
        this.accounts = new GdaxAccounts(this.client)
        
        this.listenSocketErrors()
        this.initialized = true
    }

    watchCurrencyPrice() {
        if (!this.initialized) {
            throw new Error('GdaxMarket #watchCurrencyPrice() cannot be used without being initialized')
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
            throw new Error('GdaxMarket #getCurrencyPrice() cannot be used without being initialized')
        }

        this.lastTicker = await this.publicClient.getProductTicker(this.currency)

        return parseFloat(this.lastTicker.price)
    }

    private listenSocketErrors() {
        this.socket.on('error', error => {
            Logger.error('A socket error occured')
            Logger.error(error)
        })
    }
}

export default GdaxService