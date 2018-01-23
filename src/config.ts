import keys from './keys'

const config: Config = {
    app: {
        debug: true,
    },
    api: {
        ...keys,
        uri: 'https://api.gdax.com',
        websocketURI: 'wss://ws-feed.gdax.com',
        sandboxWebsocketURI: 'wss://ws-feed-public.sandbox.gdax.com',
        sandboxURI: 'https://api-public.sandbox.gdax.com',
        sandbox: true
    },
    trader: {
        tickerInterval: 1000 * 15 // ms
    },
    market: {
        instantOrderFees: 0.0025 // <=> 0.25%
    },
    chart: {
        rateToApproveVariation: 0.0025, // <=> 0.25%
        thresholdRateToApproveInversion: 0.2, // in %
        thresholdMaxRateToApproveInversion: 1, // in %
        minPriceDifferenceToApproveNewPoint: 0.0025 // <=> 0.5%
    }
}

export default config