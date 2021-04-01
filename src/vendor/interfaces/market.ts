import { Subject } from "rxjs"
import { Accounts } from "../market/accounts"
import { CurrencyInfo } from "../market/currency-info"
import { Orders } from "../market/orders"
import { Currency } from "./currency.enum"

export default interface Market {
  lastPrice: number
  price: number
  price$: Subject<number>
  currency: Currency
  orders: Orders
  accounts: Accounts
  client: any
  publicClient?: any
  lastTicker: any
  initialized: boolean
  sandbox: boolean
  currencyInfo?: CurrencyInfo

  init(): Promise<void>
  watchCurrencyPrice(): void
  getCurrencyPrice(): Promise<number>
  ping?(): Promise<boolean>
}
