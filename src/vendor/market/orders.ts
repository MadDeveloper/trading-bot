import * as Gdax from 'gdax'
import { LimitOrder } from 'gdax';
import Order from '../interfaces/order';
import { OrderType } from '../interfaces/order-type.enum';
import { Currency } from '../interfaces/currency.enum';
import { OrderStatus } from '../interfaces/order-status.enum';

class Orders {
    pending: Order[] = []
    done: Order[] = []
    canceled: Order[] = []
    lastOrder: Order

    constructor(
        private client: Gdax.AuthenticatedClient,
        private publicClient: Gdax.PublicClient
    ) { }

    async all(): Promise<Order[]> {
        const orders: Order[] = await this.client.getOrders()

        return orders
    }

    find(id: string, status: OrderType): Order {
        let ordersToSearch = []

        if (OrderType.BUY === status || OrderType.SELL === status) {
            ordersToSearch = this.pending.slice()
        } else if (OrderType.CANCEL === status) {
            ordersToSearch = this.canceled.slice()
        } else {
            ordersToSearch = this.done
        }

        return ordersToSearch.reduce(order => {
            if (order.id === id) {
                return order
            }

            return null
        }, null)
    }

    buyOrders(): Order[] {
        return this.pending.filter(order => order.side === OrderType.BUY)
    }

    sellOrders(): Order[] {
        return this.pending.filter(order => order.side === OrderType.SELL)
    }

    async buyLimit(currency: Currency, quantity: number, price: number, allowTaker = false): Promise<any> {
        const response = await this.client.buy({
            type: 'limit',
            side: 'buy',
            price: price.toFixed(2),
            size: this.normalizeNumber(quantity),
            product_id: currency,
            post_only: !allowTaker
        })

        if (response && (<any>response).message) {
            throw Error(`Error when trying to buy with a limit order: ${JSON.stringify(response, null, 2)}`)
        }

        this.lastOrder = <Order>response
        this.pending.push(this.lastOrder)

        return this.lastOrder
    }

    async buyMarket(currency: Currency, funds: number) {
        const response = await this.client.buy({
            type: 'market',
            side: 'sell',
            size: null,
            funds: this.normalizeNumber(funds),
            product_id: currency
        })

        if (response && (<any>response).message) {
            throw Error(`Error when trying to buy with a market order: ${JSON.stringify(response, null, 2)}`)
        }

        this.lastOrder = <Order>response
        this.done.push({ ...this.lastOrder })

        return this.lastOrder
    }

    async buyStop(currency: Currency, price: number, funds: number = null) {
        const response = await this.client.buy({
            // client_oid: this.lastOrder.id,
            type: 'stop',
            side: 'sell',
            size: null,
            funds: this.normalizeNumber(funds),
            product_id: currency
        })

        if (response && (<any>response).message) {
            throw Error(`Error when trying to buy with a stop order: ${JSON.stringify(response, null, 2)}`)
        }

        this.lastOrder = <Order>response
        this.pending.push(this.lastOrder)

        return this.lastOrder
    }

    async sellLimit(currency: Currency, quantity: number, price: number, allowTaker = false) {
        const response = await this.client.sell({
            // client_oid: this.lastOrder.id,
            type: 'limit',
            side: 'sell',
            price: price.toFixed(2),
            size: this.normalizeNumber(quantity),
            product_id: currency,
            post_only: !allowTaker
        })

        if (response && (<any>response).message) {
            throw Error(`Error when trying to sell with a limit order: ${JSON.stringify(response, null, 2)}`)
        }

        this.lastOrder = <Order>response
        this.pending.push(this.lastOrder)

        return this.lastOrder
    }

    async sellMarket(currency: Currency, funds: number) {
        const response = await this.client.sell({
            // client_oid: this.lastOrder.id,
            type: 'market',
            side: 'sell',
            size: null,
            funds: this.normalizeNumber(funds),
            product_id: currency
        })

        if (response && (<any>response).message) {
            throw Error(`Error when trying to sell with a market order: ${JSON.stringify(response, null, 2)}`)
        }

        this.lastOrder = <Order>response
        this.done.push({ ...this.lastOrder })

        return this.lastOrder
    }

    async sellStop(currency: Currency, price: number, funds: number = null) {
        const response = await this.client.sell({
            // client_oid: this.lastOrder.id,
            type: 'stop',
            side: 'sell',
            size: null,
            funds: this.normalizeNumber(funds),
            product_id: currency
        })

        if (response && (<any>response).message) {
            throw Error(`Error when trying to sell with a stop order: ${JSON.stringify(response, null, 2)}`)
        }

        this.lastOrder = <Order>response
        this.pending.push(this.lastOrder)

        return this.lastOrder
    }

    cancel(order: Order) {
        this.pending = this.pending.filter(current => current.id !== order.id)
        this.canceled.push(order)

        return this
            .client
            .cancelOrder(order.id)
    }

    normalizeNumber(price: number): string {
        const priceString = price.toString()

        if (priceString.includes('.')) {
            const [integers, decimals] = priceString.split('.')

            return `${integers}.${decimals.substring(0, 8)}`
        }

        return priceString
    }
}

export default Orders