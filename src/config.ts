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
        tickerInterval: 1000 * 60, // ms
        thresholdDifferenceBetweenLastSellPrieAndNewBuyPrice: 0.5 // in %, market buy/sell have 0.25% fees!
    },
    market: {
        instantOrderFees: 0.0025 // <=> 0.25%
    },
    chart: {
        thresholdDifferenceToApproveVariation: 0.005 // <=> 0.5%
    }
}

export default config