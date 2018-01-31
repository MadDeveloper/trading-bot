import keysGdax from './keys.gdax';
import { Config } from '../typings';
import { Currency } from '../vendor/interfaces/currency.enum';
import { Smoothing } from '../vendor/chart/smoothing';
import { Platform } from './platform';

const gdaxConfig: Config = {
    app: {
        debug: true,
        platform: Platform.GDAX
    },
    network: {
        retryIntervalWhenConnectionIsLost: 5000 // ms
    },
    api: {
        ...keysGdax,
        uri: 'https://api.gdax.com',
        websocketURI: 'wss://ws-feed.gdax.com',
        sandboxWebsocketURI: 'wss://ws-feed-public.sandbox.gdax.com',
        sandboxURI: 'https://api-public.sandbox.gdax.com',
        sandbox: false
    },
    trader: {
        // Quantities strategy
        quantityOfBaseCurrencyToUse: 100, // in % (BTC, ETH, LTC, ...)

        quantityOfQuoteCurrencyToUse: 100, // in % (€, $)
        maxQuantityQuoteCurrencyToUse: 0.0022, // 100€, 100 BTC (max quantity)
        minQuantityQuoteCurrencyToUse: 0.001, // 50€, 50 BTC
        
        // Probitability strategy & exit strategies
        minProfitableRateWhenSelling: 0, // how many % profitability wanted when selling
        sellWhenPriceExceedsThresholdOfProfitability: true,
        useExitStrategyInCaseOfLosses: true,
        sellWhenLossRateReaches: 10 // in %
    },
    market: {
        currency: Currency.BTC_EUR,
        instantOrderFees: 0.001 // <=> 0.1%
    },
    account: {
        quoteCurrency: Currency.EUR, // €, $, BTC
        baseCurrency: Currency.BTC // BTC, ETH, LTC, ...
    },
    chart: {
        tickerInterval: 1000 * 15, // ms
        reductionOfTheTickerIntervalOnSpeedMode: 0.5, // <=> we reduce by 50% the ticker interval

        minPriceDifferenceToApproveNewPoint: 0.07, // <=> 0.1%
        smoothing: Smoothing.SAMPLE,

        // Pump & dump
        thresholdRateToApproveInversion: 1, // in %
        thresholdMaxRateToApproveInversion: 2, // in %
        numberOfUpPointsToValidatePump: 3,
        numberOfDownPointsToValidateDump: 3,
        validatePumpWhenBigPumpIsDetected: true,
        validateDumpWhenBigDumpIsDetected: false
    }
}

export default gdaxConfig