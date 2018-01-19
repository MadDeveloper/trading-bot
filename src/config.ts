import keys from './keys'

const config: Config = {
    api: {
        ...keys,
        uri: 'https://api.gdax.com',
        websocketURI: 'wss://ws-feed.gdax.com',
        sandboxWebsocketURI: 'wss://ws-feed-public.sandbox.gdax.com',
        sandboxURI: 'https://api-public.sandbox.gdax.com',
        sandbox: true
    },
    trader: {
        tickerInterval: 1000 // ms
    }
}

export default config