import keysBinance from './keys.binance';
import { Config } from '../typings';
import { Currency } from '../vendor/interfaces/currency.enum';
import { Smoothing } from '../vendor/chart/smoothing';
import { Platform } from './platform';

const binanceConfig: Config = {
    app: {
        debug: true,
        platform: Platform.BINANCE
    },
    api: {
        ...keysBinance,
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
        instantOrderFees: 0.001 // <=> 0.25%
    },
    account: {
        quoteCurrency: Currency.EUR, // €, $
        baseCurrency: Currency.BTC // BTC, ETH, LTC, ...
    },
    chart: {
        rateToApproveVariation: 0.0025, // <=> 0.25% FIXME: should it be still used?
        thresholdRateToApproveInversion: 0.4, // in %
        thresholdMaxRateToApproveInversion: 1, // in %
        minPriceDifferenceToApproveNewPoint: 0.07, // <=> 0.07%
        tickerInterval: 1000 * 15, // ms
        reductionOfTheTickerIntervalOnSpeedMode: 0.5, // <=> we reduce by 50% the ticker interval
        numberOfUpPointsToValidatePump: 2,
        numberOfDownPointsToValidateDump: 2,
        validatePumpWhenBigPumpIsDetected: true,
        validateDumpWhenBigDumpIsDetected: true,
        smoothing: Smoothing.MOVING_AVERAGE
    }
}

export default binanceConfig