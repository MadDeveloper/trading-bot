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
        sandbox: false
    },
    trader: {
        quantityOfBaseCurrencyToUse: 100, // in % (BTC, ETH, LTC, ...)
        quantityOfQuoteCurrencyToUse: 100, // in % (€, $)
        maxQuantityQuoteCurrencyToUse: 100, // 100€, 100 BTC (max quantity)
        minQuantityQuoteCurrencyToUse: 50, // 50€
        minProfitableRateWhenSelling: 0 // how many % profitability wanted when selling
    },
    market: {
        currency: Currency.BTC_EUR,
        instantOrderFees: 0.0025 // <=> 0.25%
    },
    account: {
        quoteCurrency: Currency.EUR, // €, $
        baseCurrency: Currency.BTC // BTC, ETH, LTC, ...
    },
    chart: {
        rateToApproveVariation: 0.0025, // <=> 0.25%
        thresholdRateToApproveInversion: 0.2, // in %
        thresholdMaxRateToApproveInversion: 1, // in %
        minPriceDifferenceToApproveNewPoint: 0.004, // <=> 0.4%
        tickerInterval: 1000 * 15, // ms
        reductionOfTheTickerIntervalOnSpeedMode: 0.5 // <=> we reduce by 30% the ticker interval
    }
}

export default config