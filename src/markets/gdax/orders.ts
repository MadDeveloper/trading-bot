import * as Gdax from "gdax"
import { Currency } from "../../vendor/interfaces/currency.enum"
import { OrderSide } from "../../vendor/interfaces/order-type.enum"
import { OrderResult } from "../../vendor/market/order"
import { Orders } from "../../vendor/market/orders"

class GdaxOrders implements Orders {
  pending: OrderResult[] = []
  done: OrderResult[] = []
  canceled: OrderResult[] = []
  lastOrder: OrderResult

  constructor(
    private client: Gdax.AuthenticatedClient,
    private publicClient: Gdax.PublicClient
  ) {}

  async all(): Promise<OrderResult[]> {
    const orders: OrderResult[] = await this.client.getOrders()

    return orders
  }

  find(id: string, status: OrderSide): OrderResult {
    let ordersToSearch = []

    if (OrderSide.BUY === status || OrderSide.SELL === status) {
      ordersToSearch = this.pending.slice()
    } else if (OrderSide.CANCEL === status) {
      ordersToSearch = this.canceled.slice()
    } else {
      ordersToSearch = this.done
    }

    return ordersToSearch.reduce((order) => {
      if (order.id === id) {
        return order
      }

      return null
    }, null)
  }

  buyOrders(): OrderResult[] {
    return this.pending.filter((order) => order.side === OrderSide.BUY)
  }

  sellOrders(): OrderResult[] {
    return this.pending.filter((order) => order.side === OrderSide.SELL)
  }

  async buyLimit(
    currency: Currency,
    quantity: number,
    price: number,
    allowTaker = false
  ): Promise<any> {
    const response = await this.client.buy({
      type: "limit",
      side: "buy",
      price: price.toFixed(2),
      size: this.normalizeNumber(quantity),
      product_id: currency,
      post_only: !allowTaker,
    })

    if (response && (<any>response).message) {
      throw Error(
        `Error when trying to buy with a limit order: ${JSON.stringify(
          response,
          null,
          2
        )}`
      )
    }

    this.lastOrder = this.forgeOrderResult(response)
    this.pending.push(this.lastOrder)

    return this.lastOrder
  }

  async buyMarket(currency: Currency, funds: number) {
    const response = await this.client.buy({
      type: "market",
      side: "buy",
      size: null,
      funds: this.normalizeNumber(funds),
      product_id: currency,
    })

    if (response && (<any>response).message) {
      throw Error(
        `Error when trying to buy with a market order: ${JSON.stringify(
          response,
          null,
          2
        )}`
      )
    }

    this.lastOrder = this.forgeOrderResult(response)
    this.done.push({ ...this.lastOrder })

    return this.lastOrder
  }

  async buyStop(currency: Currency, price: number, funds: number = null) {
    const response = await this.client.buy({
      type: "stop",
      side: "buy",
      size: null,
      funds: this.normalizeNumber(funds),
      product_id: currency,
    })

    if (response && (<any>response).message) {
      throw Error(
        `Error when trying to buy with a stop order: ${JSON.stringify(
          response,
          null,
          2
        )}`
      )
    }

    this.lastOrder = this.forgeOrderResult(response)
    this.pending.push(this.lastOrder)

    return this.lastOrder
  }

  async sellLimit(
    currency: Currency,
    quantity: number,
    price: number,
    allowTaker = false
  ) {
    const response = await this.client.sell({
      type: "limit",
      side: "sell",
      price: price.toFixed(2),
      size: this.normalizeNumber(quantity),
      product_id: currency,
      post_only: !allowTaker,
    })

    if (response && (<any>response).message) {
      throw Error(
        `Error when trying to sell with a limit order: ${JSON.stringify(
          response,
          null,
          2
        )}`
      )
    }

    this.lastOrder = this.forgeOrderResult(response)
    this.pending.push(this.lastOrder)

    return this.lastOrder
  }

  async sellMarket(currency: Currency, size: number) {
    const response = await this.client.sell({
      type: "market",
      side: "sell",
      size: this.normalizeNumber(size),
      funds: undefined, // undefined is important here, null value returns 400 from API, and funds is needed by typings
      product_id: currency,
    })

    if (response && (<any>response).message) {
      throw Error(
        `Error when trying to sell with a market order: ${JSON.stringify(
          response,
          null,
          2
        )}`
      )
    }

    this.lastOrder = this.forgeOrderResult(response)
    this.done.push({ ...this.lastOrder })

    return this.lastOrder
  }

  async sellStop(currency: Currency, price: number, size: number) {
    const response = await this.client.sell({
      type: "stop",
      side: "sell",
      size: this.normalizeNumber(size),
      funds: undefined, // undefined is important here, null value returns 400 from API, and funds is needed by typings
      product_id: currency,
    })

    if (response && (<any>response).message) {
      throw Error(
        `Error when trying to sell with a stop order: ${JSON.stringify(
          response,
          null,
          2
        )}`
      )
    }

    this.lastOrder = this.forgeOrderResult(response)
    this.pending.push(this.lastOrder)

    return this.lastOrder
  }

  cancel(order: OrderResult) {
    this.pending = this.pending.filter((current) => current.id !== order.id)
    this.canceled.push(order)

    return this.client.cancelOrder(order.id)
  }

  normalizeNumber(price: number): string {
    const priceString = price.toString()

    if (priceString.includes(".")) {
      const [integers, decimals] = priceString.split(".")

      return `${integers}.${decimals.substring(0, 8)}`
    }

    return priceString
  }

  private forgeOrderResult(order: any): OrderResult {
    return {
      id: order.id,
      symbol: order.product_id,
      clientOrderId: null,
      transactionTime: new Date(order.created_at).getTime(),
      price: parseFloat(order.price),
      originQuantity: parseFloat(order.size),
      executedQuantity: parseFloat(order.filled_size),
      status: order.status,
      timeInForce: order.time_in_force,
      type: order.type,
      side: order.side,
    }
  }
}

export default GdaxOrders
