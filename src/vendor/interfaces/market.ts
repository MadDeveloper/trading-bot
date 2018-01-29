import { Currency } from "./currency.enum";
import { Subject } from "rxjs/Subject";
import { Accounts } from "../market/accounts";
import { Orders } from "../market/orders";

export default interface Market {
    lastPrice: number
    price: number
    price$: Subject<number>
    currency: Currency
    orders: Orders
    accounts: Accounts
    client: any
    publicClient: any
    lastTicker: any
    initialized: boolean
    sandbox: boolean

    init(): void
    watchCurrencyPrice(): void
    getCurrencyPrice(): Promise<number>
}