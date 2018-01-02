import * as crypto from 'crypto'
import * as Gdax from 'gdax'
import config from './config'
import io from 'socket.io-client'
import request from 'request-promise'

const channels = ['ticker']
const publicClient = new Gdax.PublicClient(config.api.uri)
const client = new Gdax.AuthenticatedClient(config.api.key, config.api.secret, config.api.passphrase, config.api.uri)
const websocket = new Gdax.WebsocketClient(['BTC-EUR'], config.api.websocketURI, {
    key: config.api.key,
    secret: config.api.secret,
    passphrase: config.api.passphrase
}, { channels })

async function start() {
    try {
        const timestamp = (await publicClient.getTime()).epoch

        // const requestPath = '/orders'
        // const body = JSON.stringify({
        //     price: '1.0',
        //     size: '1.0',
        //     side: 'buy',
        //     product_id: 'BTC-EUR',
        //     post_only: true
        // });
        // const method = 'POST'
        // const what = timestamp + method + requestPath + body
        // const key = Buffer(config.api.secret, 'base64')
        // const hmac = crypto.createHmac('sha256', key)
        // const sign = hmac.update(what).digest('base64')

        // const response = await request(config.api.uri + requestPath, {
        //     method,
        //     headers: {
        //         'CB-ACCESS-KEY': config.api.key,
        //         'CB-ACCESS-SIGN': sign,
        //         'CB-ACCESS-TIMESTAMP': timestamp,
        //         'CB-ACCESS-PASSPHRASE': config.api.passphrase,
        //         'Content-Type': 'application/json',
        //         'User-Agent': 'Bot'
        //     },
        //     body
        // })

        // console.log('response received', response)

        // const responseBuy = await client.buy({
        //     post_only: true,
        //     price: '1.0',
        //     size: '1.0',
        //     side: 'buy',
        //     product_id: 'BTC-EUR'
        // })

        // console.log('response received', responseBuy)

        // const orderBook = await client.getProductOrderBook('BTC-EUR', { level: 2 })
        const ticker = await publicClient.getProductTicker('BTC-EUR')


    } catch (error) {
        console.error('Une erreur', error)
    }

    websocket.on('message', (data: any) => {
        if (data) {
            if ('ticker' === data.type) {
                console.log(`BTC: ${parseFloat(data.price).toFixed(3)}€`)
            }
        }
    });
    websocket.on('error', error => console.error(error));

    // console.log(orderbook.books['BTC-EUR'].state())
}

start()