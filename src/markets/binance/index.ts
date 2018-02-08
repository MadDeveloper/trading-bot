import * as binance from 'node-binance-api';
import BinanceAccounts from './accounts';
import BinanceOrders from './orders';
import Logger from '../../vendor/logger/index';
import Market from '../../vendor/interfaces/market';
import Orders from '../../vendor/market/orders';
import { Accounts } from '../../vendor/market/accounts';
import { config } from '../../config';
import { Currency } from '../../vendor/interfaces/currency.enum';
import { CurrencyInfo } from '../../vendor/market/currency-info';
import { promisify } from 'util';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';

class BinanceMarket implements Market {
    currency: Currency
    orders: Orders
    accounts: Accounts
    publicClient: any
    client: any
    channels: string[]
    price$: Subject<number>
    lastPrice: number
    price: number
    sandbox: boolean
    lastTicker: any
    initialized: boolean
    currencyInfo: CurrencyInfo

    constructor(channels: string[] = ['ticker']) {
        this.currency = config.market.currency
        this.channels = channels
        this.sandbox = config.api.sandbox
        this.price$ = new Subject()
    }

    async init() {
        this.client = binance
        this.orders = new BinanceOrders(this.client, this)
        this.accounts = new BinanceAccounts(this.client)

        this.client.options({
            APIKEY: config.api.key,
            APISECRET: config.api.secret,
            useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
            test: config.api.sandbox
        })

        await this.loadCurrencyInfo()

        this.initialized = true
    }

    watchCurrencyPrice() {
        throw new Error('BinanceMarket #watchCurrencyPrice() method is not implemented')
    }

    async getCurrencyPrice() {
        if (!this.initialized) {
            throw new Error('BinanceMarket #getCurrencyPrice() cannot be used without being initialized')
        }

        const prices = promisify(this.client.prices)

        this.lastTicker = await prices(this.currency)

        const currencyTicker = this.lastTicker[this.currency]

        return parseFloat(currencyTicker)
    }

    async loadCurrencyInfo() {
        const exchangeInfo = promisify(this.client.exchangeInfo)
        const data = await exchangeInfo()

        for (let currencyInfo of data.symbols) {
            if (currencyInfo.symbol === this.currency) {
                this.currencyInfo = currencyInfo

                break
            }
        }
    }
}

export default BinanceMarket