import BinanceService, { Binance } from "binance-api-node"
import { Subject } from "rxjs"
import { config } from "../../config"
import { Currency } from "../../vendor/interfaces/currency.enum"
import Market from "../../vendor/interfaces/market"
import { Accounts } from "../../vendor/market/accounts"
import { CurrencyInfo } from "../../vendor/market/currency-info"
import Orders from "../../vendor/market/orders"
import BinanceAccounts from "./accounts"
import BinanceOrders from "./orders"

class BinanceMarket implements Market {
  currency: Currency
  orders: Orders
  accounts: Accounts
  publicClient: any
  client: Binance
  price$: Subject<number>
  lastPrice: number
  price: number
  sandbox: boolean
  lastTicker: any
  initialized: boolean
  currencyInfo: CurrencyInfo

  constructor() {
    this.currency = config.market.currency
    this.sandbox = config.api.sandbox
    this.price$ = new Subject()
  }

  async init() {
    this.client = BinanceService({
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
    })
    this.orders = new BinanceOrders(this.client, this)
    this.accounts = new BinanceAccounts(this.client)

    await this.loadCurrencyInfo()

    this.initialized = true
  }

  async ping() {
    // TODO: implement ping test here
    return true
  }

  watchCurrencyPrice() {
    throw new Error(
      "BinanceMarket #watchCurrencyPrice() method is not implemented"
    )
  }

  async getCurrencyPrice() {
    if (!this.initialized) {
      throw new Error(
        "BinanceMarket #getCurrencyPrice() cannot be used without being initialized"
      )
    }

    this.lastTicker = await this.client.prices({ symbol: this.currency })

    const currencyTicker = this.lastTicker[this.currency]

    return parseFloat(currencyTicker)
  }

  async loadCurrencyInfo() {
    const { symbols } = await this.client.exchangeInfo()

    for (let symbolData of symbols) {
      if (symbolData.symbol === this.currency) {
        this.currencyInfo = symbolData

        break
      }
    }
  }
}

export default BinanceMarket
