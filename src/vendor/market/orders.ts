import { OrderType } from '../interfaces/order-type.enum';
import { Currency } from '../interfaces/currency.enum';
import { OrderResult } from './order';

export interface Orders {
    pending: OrderResult[]
    done: OrderResult[]
    canceled: OrderResult[]
    lastOrder: OrderResult

    all(): Promise<OrderResult[]>

    find?(id: string, status: OrderType): OrderResult

    buyOrders(): OrderResult[]

    sellOrders(): OrderResult[]

    buyLimit(currency: Currency, quantity: number, price: number, allowTaker: boolean): Promise<any>

    buyMarket(currency: Currency, funds: number, marketPrice?: number): Promise<any>

    buyStop(currency: Currency, price: number, funds: number): Promise<any>

    sellLimit(currency: Currency, quantity: number, price: number, allowTaker: boolean): Promise<any>

    sellMarket(currency: Currency, size: number, marketPrice?: number): Promise<any>

    sellStop(currency: Currency, price: number, size: number): Promise<any>

    cancel(order: OrderResult): any
}

export default Orders