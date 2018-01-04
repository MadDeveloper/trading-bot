import { Currency } from "./currency.enum";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import Orders from '../market/orders';
import Accounts from '../market/accounts';

export default interface Market {
    price$: BehaviorSubject<number>
    currency: Currency
    orders: Orders
    accounts: Accounts
    client: any
    publicClient: any

    init(): void
    watchCurrencyPrice(): void
}