import keys from './keys'
import { Currency } from './vendor/interfaces/currency.enum';
import { Config } from './typings';

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
        currency: Currency.BTC_EUR,
        instantOrderFees: 0.0025 // <=> 0.25%
    },
    account: {
        fiatCurrency: Currency.EUR,
        cryptoCurrency: Currency.BTC
    },
    chart: {
        rateToApproveVariation: 0.0025, // <=> 0.25%
        thresholdRateToApproveInversion: 0.2, // in %
        thresholdMaxRateToApproveInversion: 1, // in %
        minPriceDifferenceToApproveNewPoint: 0.004 // <=> 0.4%
    }
}

export default config