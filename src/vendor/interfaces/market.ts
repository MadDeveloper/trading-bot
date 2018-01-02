import { Currency } from "./currency.enum";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import Orders from '../market/orders';

export default interface Market {
    price$: BehaviorSubject<number>
    currency: Currency
    orders: Orders
    
    watchCurrencyPrice(): void
}