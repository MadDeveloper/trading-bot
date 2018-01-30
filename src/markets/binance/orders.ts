import * as Gdax from 'gdax';
import Logger from '../../vendor/logger/index';
import Market from '../../vendor/interfaces/market';
import { Currency } from '../../vendor/interfaces/currency.enum';
import { CurrencyFilter, CurrencyInfo } from '../../vendor/market/currency-info';
import { LimitOrder } from 'gdax';
import { OrderResult } from '../../vendor/market/order';
import { Orders } from '../../vendor/market/orders';
import { OrderStatus } from '../../vendor/interfaces/order-status.enum';
import { OrderType } from '../../vendor/interfaces/order-type.enum';
import { promisify } from 'util';
import { floatSafeRemainder } from '../../vendor/chart/maths';

class BinanceOrders implements Orders {
    pending: OrderResult[] = []
    done: OrderResult[] = []
    canceled: OrderResult[] = []
    lastOrder: OrderResult
    client: any
    market: Market

    constructor(client: any, market: Market) {
        this.client = client
        this.market = market
    }

    async all(): Promise<OrderResult[]> {
        const orders: OrderResult[] = await this.client.getOrders()

        return orders
    }

    buyOrders(): OrderResult[] {
        return this.pending.filter(order => order.side === OrderType.BUY)
    }

    sellOrders(): OrderResult[] {
        return this.pending.filter(order => order.side === OrderType.SELL)
    }

    async buyLimit(currency: Currency, quantity: number, price: number, allowTaker = false): Promise<any> {
        return this.lastOrder
    }

    async buyMarket(currency: Currency, funds: number, marketPrice: number): Promise<OrderResult> {
        const buy = promisify(this.client.marketBuy)

        try {
            const quantity = this.normalizeQuantity(funds / marketPrice)
            const response = await buy(currency, quantity)

            if (!response) {
                throw Error(`Error when trying to buy with a market order: ${JSON.stringify(response, null, 2)}`)
            }

            console.log('Buy response from market', response)

            this.lastOrder = this.forgeOrderResult(response)
            this.done.push({ ...this.lastOrder })

            return this.lastOrder
        } catch (error) {
            Logger.error(error.toJSON ? error.toJSON() : error)
        }
    }

    async buyStop(currency: Currency, price: number, funds: number = null): Promise<any> {
        return this.lastOrder
    }

    async sellLimit(currency: Currency, quantity: number, price: number, allowTaker = false): Promise<any> {
        return this.lastOrder
    }

    async sellMarket(currency: Currency, size: number): Promise<OrderResult> {
        const sell = promisify(this.client.marketSell)
        const quantity = this.normalizeQuantity(size)
        const response = await sell(currency, quantity)

        if (!response) {
            throw Error(`Error when trying to sell with a market order: ${JSON.stringify(response, null, 2)}`)
        }

        console.log('Sell response from market', response)

        this.lastOrder = this.forgeOrderResult(response)
        this.done.push({ ...this.lastOrder })

        return this.lastOrder
    }

    async sellStop(currency: Currency, price: number, size: number): Promise<any> {
        return this.lastOrder
    }

    cancel(order: OrderResult) {
        this.pending = this.pending.filter(current => current.id !== order.id)
        this.canceled.push(order)

        return this.client.cancelOrder(order.id)
    }

    normalizeQuantity(quantity: number): number {
        const currencyInfo: CurrencyInfo = this.market.currencyInfo
        const currencyLotSizeFilter = this.getLotSizeFilter(currencyInfo)
        const currencyMinNotionalFilter = this.getMinNotionalFilter(currencyInfo)
        const minQuantity = parseFloat(currencyLotSizeFilter.minQty)
        const maxQuantity = parseFloat(currencyLotSizeFilter.maxQty)
        const stepSize = parseFloat(currencyLotSizeFilter.stepSize)
        const minNotional = parseFloat(currencyMinNotionalFilter.minNotional)
        const numberOfDigits = Number(currencyInfo.quotePrecision)

        if (quantity < minQuantity) {
            throw new Error(`Cannot normalize quantity, the quantity is below the minQuantity (quantity: ${quantity}, minQuantity: ${minQuantity})`)
        }

        if (floatSafeRemainder(quantity, stepSize) !== 0) { // floatSafeRemainder => reel js remainder
            quantity -= floatSafeRemainder(quantity, stepSize)
        }

        if (quantity > maxQuantity) {
            quantity = maxQuantity
        }

        const quantityString = quantity.toString()
        let normalizedQuantity = quantity

        if (quantityString.includes('.')) {
            const [integers, decimals] = quantityString.split('.')

            normalizedQuantity = Number(`${integers}.${decimals.substring(0, 8)}`)
        }

        return normalizedQuantity
    }

    private getLotSizeFilter(currencyInfo: CurrencyInfo): CurrencyFilter {
        let filter: CurrencyFilter

        currencyInfo.filters.forEach(currentFilter => {
            if (currentFilter.filterType.toUpperCase() === 'LOT_SIZE') {
                filter = currentFilter
            }
        })

        return filter
    }

    private getMinNotionalFilter(currencyInfo: CurrencyInfo): CurrencyFilter {
        let filter: CurrencyFilter

        currencyInfo.filters.forEach(currentFilter => {
            if (currentFilter.filterType.toUpperCase() === 'MIN_NOTIONAL') {
                filter = currentFilter
            }
        })

        return filter
    }

    private forgeOrderResult(order: any): OrderResult {
        return {
            id: order.orderId,
            symbol: order.symbol,
            clientOrderId: order.clientOrderId,
            transactionTime: order.transactionTime,
            price: parseFloat(order.price),
            originQuantity: parseFloat(order.origQty),
            executedQuantity: parseFloat(order.executedQty),
            status: order.status,
            timeInForce: order.timeInForce,
            type: order.type,
            side: order.side
        }
    }
}

export default BinanceOrders