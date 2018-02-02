import * as Gdax from 'gdax';
import Logger from '../../vendor/logger/index';
import Market from '../../vendor/interfaces/market';
import { Currency } from '../../vendor/interfaces/currency.enum';
import { CurrencyFilter, CurrencyInfo } from '../../vendor/market/currency-info';
import { LimitOrder } from 'gdax';
import { OrderResult, OrderFill } from '../../vendor/market/order';
import { Orders } from '../../vendor/market/orders';
import { OrderStatus } from '../../vendor/interfaces/order-status.enum';
import { OrderType } from '../../vendor/interfaces/order-type.enum';
import { promisify } from 'util';
import { floatSafeRemainder, truncateLongDigits } from '../../vendor/chart/maths';
import { config } from '../../config/index';

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
        const buy = config.api.sandbox ? this.fakeBuyMarket : promisify(this.client.marketBuy)

        try {
            const quantity = this.normalizeQuantity(funds / marketPrice)
            const response = await buy(currency, quantity, { newOrderRespType: 'FULL' })

            if (!response) {
                throw Error(`Error when trying to buy with a market order: ${JSON.stringify(response, null, 2)}`)
            }

            Logger.debug('Buy response from market')
            Logger.debug(JSON.stringify(response, null, 2))

            this.lastOrder = this.forgeOrderResult(response)
            this.lastOrder.price = this.computeFillsWeightedAveragePrice(this.lastOrder)
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
        const sell = config.api.sandbox ? this.fakeSellMarket : promisify(this.client.marketSell)
        const quantity = this.normalizeQuantity(size)
        const response = await sell(currency, quantity, { newOrderRespType: 'FULL' })

        if (!response) {
            throw Error(`Error when trying to sell with a market order: ${JSON.stringify(response, null, 2)}`)
        }

        Logger.debug('Sell response from market')
        Logger.debug(JSON.stringify(response, null, 2))

        this.lastOrder = this.forgeOrderResult(response)
        this.lastOrder.price = this.computeFillsWeightedAveragePrice(this.lastOrder)
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
        const numberOfDigits = Number(currencyInfo.baseAssetPrecision)

        quantity = truncateLongDigits(quantity, numberOfDigits)

        if (quantity < minQuantity) {
            if (config.api.sandbox) {
                // in sandbox mode we do not throw an error, we just notify and set to minQuantity
                quantity = minQuantity
                Logger.debug(`Quantity is below the minQuantity, but in sandbox mode this error can be ignored.`)
            } else {
                throw new Error(`Cannot normalize quantity, the quantity is below the minQuantity (quantity: ${quantity}, minQuantity: ${minQuantity})`)
            }
        }

        if (floatSafeRemainder(quantity, stepSize) !== 0) { // floatSafeRemainder => reel js remainder
            Logger.debug(`Remove remainder from quantity with step size. Quantity: ${quantity} ; stepSize: ${stepSize} ; quantity after remainder: ${Number(quantity - floatSafeRemainder(quantity, stepSize)).toFixed(numberOfDigits)}`)
            quantity = parseFloat(Number(quantity - floatSafeRemainder(quantity, stepSize)).toFixed(numberOfDigits))
        }

        if (quantity > maxQuantity) {
            quantity = maxQuantity
        }

        const normalizedQuantity = truncateLongDigits(quantity, numberOfDigits)

        Logger.debug(`Quantity normalized: ${normalizedQuantity}`)

        return normalizedQuantity
    }

    getMinQuantity(): number {
        const currencyLotSizeFilter = this.getLotSizeFilter(this.market.currencyInfo)

        return parseFloat(currencyLotSizeFilter.minQty)
    }

    private async fakeBuyMarket(currency: Currency, quantity: number) {
        return {
            orderId: 'fake',
            symbol: currency,
            clientOrderId: 'fake',
            transactionTime: Date.now(),
            price: '0.00000000',
            origQty: quantity.toString(),
            executedQty: quantity.toString(),
            status: 'FILLED',
            timeInForce: 'GTC',
            type: 'MARKET',
            side: 'BUY'
        }
    }

    private async fakeSellMarket(currency: Currency, quantity: number) {
        return {
            orderId: 'fake',
            symbol: currency,
            clientOrderId: 'fake',
            transactionTime: Date.now(),
            price: '0.00000000',
            origQty: quantity.toString(),
            executedQty: quantity.toString(),
            status: 'FILLED',
            timeInForce: 'GTC',
            type: 'MARKET',
            side: 'SELL'
        }
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
            side: order.side,
            fills: this.forgeOrderResultFills(order)
        }
    }

    private forgeOrderResultFills(order: any): OrderFill[] {
        const fills = order.fills

        if (!Array.isArray(fills)) {
            return null
        }

        return fills.map((fill: any): OrderFill => ({
            price: parseFloat(fill.price),
            quantity: parseFloat(fill.qty),
            commission: parseFloat(fill.commission),
            commissionAsset: fill.commissionAsset
        }))
    }

    private computeFillsWeightedAveragePrice(order: OrderResult): number {
        if (!Array.isArray(order.fills)) {
            return null
        }

        let quantitySum = 0
        let sum = 0

        order.fills.forEach(fill => {
            sum += (fill.quantity * fill.price)
            quantitySum += fill.quantity
        })

        return parseFloat((sum / quantitySum).toFixed(8))
    }
}

export default BinanceOrders