import * as Gdax from 'gdax'
import * as uuid from 'uuid/v4'
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

    async buy(currency: Currency, quantity: number, price: number, instant = false): Promise<any> {
        this.lastOrder = <Order>await this
            .client
            .placeOrder({
                type: 'limit',
                side: 'buy',
                price: price.toFixed(2),
                size: quantity.toFixed(8),
                product_id: currency,
                post_only: !instant
            })

        this.pending.push(this.lastOrder)

        return this.lastOrder
    }

    async sell(currency: Currency, quantity: number, price: number, instant = false) {
        this.lastOrder = <Order>await this
            .client
            .placeOrder({
                client_oid: this.lastOrder.id,
                type: 'limit',
                side: 'sell',
                price: price.toFixed(5),
                size: quantity.toFixed(8),
                product_id: currency,
                post_only: !instant
            })

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
}

export default Orders