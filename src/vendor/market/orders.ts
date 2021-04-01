import { CancelOrderResult, Order } from "binance-api-node"
import { Currency } from "../interfaces/currency.enum"
import { OrderSide } from "../interfaces/order-type.enum"
import { OrderResult } from "./order"

export interface Orders {
  pending: Order[]
  done: Order[]
  canceled: Order[]
  lastOrder: Order

  all(): Promise<OrderResult[]>

  find?(id: string, status: OrderSide): Order

  buyOrders(): Order[]

  sellOrders(): Order[]

  buyLimit(
    currency: Currency,
    quantity: number,
    price: number,
    allowTaker: boolean
  ): Promise<Order>

  buyMarket(
    currency: Currency,
    funds: number,
    marketPrice?: number
  ): Promise<Order>

  buyStop(currency: Currency, price: number, funds: number): Promise<Order>

  sellLimit(
    currency: Currency,
    quantity: number,
    price: number,
    allowTaker: boolean
  ): Promise<Order>

  sellMarket(
    currency: Currency,
    size: number,
    marketPrice?: number
  ): Promise<Order>

  sellStop(currency: Currency, price: number, size: number): Promise<Order>

  normalizeQuantity?(quantity: number): number

  getMinQuantity?(): number

  cancel(order: Order): Promise<CancelOrderResult>
}

export default Orders
