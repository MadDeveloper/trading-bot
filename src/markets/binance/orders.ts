import {
  Binance,
  Order,
  SymbolLotSizeFilter,
  SymbolMinNotionalFilter,
} from "binance-api-node"
import { config } from "../../config/index"
import {
  floatSafeRemainder,
  truncateLongDigits,
} from "../../vendor/chart/maths"
import { Currency } from "../../vendor/interfaces/currency.enum"
import Market from "../../vendor/interfaces/market"
import { OrderSide, OrderType } from "../../vendor/interfaces/order-type.enum"
import Logger from "../../vendor/logger/index"
import { CurrencyInfo } from "../../vendor/market/currency-info"
import { OrderResult } from "../../vendor/market/order"
import { Orders } from "../../vendor/market/orders"

class BinanceOrders implements Orders {
  pending: Order[] = []
  done: Order[] = []
  canceled: Order[] = []
  lastOrder: Order
  client: Binance
  market: Market

  constructor(client: Binance, market: Market) {
    this.client = client
    this.market = market
  }

  async all(symbol?: Currency): Promise<OrderResult[]> {
    return this.client.allOrders({
      symbol,
      useServerTime: true,
    })
  }

  buyOrders(): Order[] {
    return this.pending.filter((order) => order.side === OrderSide.BUY)
  }

  sellOrders(): Order[] {
    return this.pending.filter((order) => order.side === OrderSide.SELL)
  }

  async buyLimit(
    currency: Currency,
    quantity: number,
    price: number,
    allowTaker = false
  ) {
    return this.lastOrder
  }

  async buyMarket(currency: Currency, funds: number, price: number) {
    try {
      const orderParams = {
        symbol: currency,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        quantity: this.normalizeQuantity(funds / price).toString(),
      }
      const order = config.api.sandbox
        ? await this.fakeOrder(orderParams)
        : await this.client.order({ ...orderParams, side: "BUY" })

      if (!order) {
        throw Error(
          `Error when trying to buy with a market order: ${JSON.stringify(
            order,
            null,
            2
          )}`
        )
      }

      Logger.debug("Buy response from market")
      Logger.debug(JSON.stringify(order, null, 2))

      this.lastOrder = this.forgeOrder(order)
      this.done.push({ ...this.lastOrder })

      return this.lastOrder
    } catch (error) {
      Logger.error(error.toJSON ? error.toJSON() : error)
    }
  }

  async buyStop(
    currency: Currency,
    price: number,
    funds: number = null
  ): Promise<any> {
    throw new Error("BinancerOrder#buyStop() method not implemented.")
  }

  async sellLimit(
    currency: Currency,
    quantity: number,
    price: number,
    allowTaker = false
  ): Promise<any> {
    throw new Error("BinancerOrder#sellLimit() method not implemented.")
  }

  async sellMarket(currency: Currency, size: number): Promise<Order> {
    const orderParams = {
      symbol: currency,
      side: OrderSide.SELL,
      type: OrderType.MARKET,
      quantity: this.normalizeQuantity(size).toString(),
    }
    const order = config.api.sandbox
      ? await this.fakeOrder(orderParams)
      : await this.client.order({ ...orderParams, side: "SELL" })

    if (!order) {
      throw Error(
        `Error when trying to sell with a market order: ${JSON.stringify(
          order,
          null,
          2
        )}`
      )
    }

    Logger.debug("Sell response from market")
    Logger.debug(JSON.stringify(order, null, 2))

    this.lastOrder = order
    this.done.push({ ...this.lastOrder })

    return this.lastOrder
  }

  async sellStop(
    currency: Currency,
    price: number,
    size: number
  ): Promise<any> {
    return this.lastOrder
  }

  cancel(order: Order) {
    this.pending = this.pending.filter(
      (current) => current.orderId !== order.orderId
    )
    this.canceled.push(order)

    return this.client.cancelOrder({
      symbol: order.symbol,
      orderId: order.orderId,
      useServerTime: true,
    })
  }

  normalizeQuantity(quantity: number): number {
    const currencyInfo: CurrencyInfo = this.market.currencyInfo
    const currencyLotSizeFilter = this.getLotSizeFilter(currencyInfo)
    const currencyMinNotionalFilter = this.getMinNotionalFilter(currencyInfo)
    const minQuantity = parseFloat(currencyLotSizeFilter.minQty)
    const maxQuantity = parseFloat(currencyLotSizeFilter.maxQty)
    const stepSize = parseFloat(currencyLotSizeFilter.stepSize)
    const minNotional = parseFloat(currencyMinNotionalFilter.minNotional)
    const numberOfDigits = Number(currencyInfo.baseAssetPrecision)

    quantity = truncateLongDigits(quantity, numberOfDigits)

    if (quantity < minQuantity) {
      if (config.api.sandbox) {
        // in sandbox mode we do not throw an error, we just notify and set to minQuantity
        quantity = minQuantity
        Logger.debug(
          `Quantity is below the minQuantity, but in sandbox mode this error can be ignored.`
        )
      } else {
        throw new Error(
          `Cannot normalize quantity, the quantity is below the minQuantity (quantity: ${quantity}, minQuantity: ${minQuantity})`
        )
      }
    }

    if (floatSafeRemainder(quantity, stepSize) !== 0) {
      // floatSafeRemainder => reel js remainder
      Logger.debug(
        `Remove remainder from quantity with step size. Quantity: ${quantity} ; stepSize: ${stepSize} ; quantity after remainder: ${Number(
          quantity - floatSafeRemainder(quantity, stepSize)
        ).toFixed(numberOfDigits)}`
      )
      quantity = parseFloat(
        Number(quantity - floatSafeRemainder(quantity, stepSize)).toFixed(
          numberOfDigits
        )
      )
    }

    if (quantity > maxQuantity) {
      quantity = maxQuantity
    }

    const normalizedQuantity = truncateLongDigits(quantity, numberOfDigits)

    Logger.debug(`Quantity normalized: ${normalizedQuantity}`)

    return normalizedQuantity
  }

  getMinQuantity(): number {
    const currencyLotSizeFilter = this.getLotSizeFilter(
      this.market.currencyInfo
    )

    return parseFloat(currencyLotSizeFilter.minQty)
  }

  private async fakeOrder({
    symbol,
    side,
    quantity,
    price,
    type,
  }: {
    symbol: Currency
    side: OrderSide
    quantity: string
    price?: string
    type?: OrderType
  }): Promise<Order> {
    return {
      symbol,
      clientOrderId: "fake",
      cummulativeQuoteQty: "",
      orderId: 0,
      orderListId: 0,
      transactTime: Date.now(),
      price: price ?? "0.00000000",
      origQty: quantity,
      executedQty: quantity,
      status: "FILLED",
      timeInForce: "GTC",
      type,
      side: side === OrderSide.BUY ? "BUY" : "SELL",
    }
  }

  private getLotSizeFilter(currencyInfo: CurrencyInfo): SymbolLotSizeFilter {
    return currencyInfo.filters.find(
      (filter) => filter.filterType.toUpperCase() === "LOT_SIZE"
    ) as SymbolLotSizeFilter
  }

  private getMinNotionalFilter(
    currencyInfo: CurrencyInfo
  ): SymbolMinNotionalFilter {
    return currencyInfo.filters.find(
      (filter) => filter.filterType.toUpperCase() === "MIN_NOTIONAL"
    ) as SymbolMinNotionalFilter
  }

  private forgeOrder(order: Order): Order {
    return {
      ...order,
      price: this.computeFillsWeightedAveragePrice(order),
    }
  }

  private computeFillsWeightedAveragePrice(order: Order): string {
    if (!Array.isArray(order.fills)) {
      return null
    }

    let quantitySum = 0
    let sum = 0

    order.fills.forEach((fill) => {
      sum += parseFloat(fill.qty) * parseFloat(fill.price)
      quantitySum += parseFloat(fill.qty)
    })

    return (sum / quantitySum).toFixed(8)
  }
}

export default BinanceOrders
