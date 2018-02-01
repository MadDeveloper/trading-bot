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
    network: {
        retryIntervalWhenConnectionIsLost: 5000 // ms
    },
    api: {
        ...keysBinance,
        sandbox: false
    },
    trader: {
        // Quantities strategy
        quantityOfBaseCurrencyToUse: 100, // in % (BTC, ETH, LTC, ...)
        quantityOfQuoteCurrencyToUse: 100, // in % (€, $)
        maxQuantityQuoteCurrencyToUse: 0.0035, // 100€, 100 BTC (max quantity)
        minQuantityQuoteCurrencyToUse: 0.001, // 50€, 50 BTC
        
        // Probitability strategy & exit strategies

        // Max threshold
        sellWhenPriceExceedsMaxThresholdOfProfitability: true,
        maxThresholdOfProfitability: 0.5, // in %
        
        // Min threshold
        sellWhenPriceExceedsMinThresholdOfProfitability: true,
        minThresholdOfProfitability: 0.22, // how many % profitability wanted when selling
        quantityToSellWhenPriceExceedsMinThresholdOfProfitability: 25, // in %

        useExitStrategyInCaseOfLosses: true,
        sellWhenLossRateReaches: 10 // in %
    },
    market: {
        currency: Currency.DGDBTC,
        orderFees: 0.001 // <=> 0.1%
    },
    account: {
        quoteCurrency: Currency.BTC, // €, $, BTC
        baseCurrency: Currency.DGD // BTC, ETH, LTC, ...
    },
    chart: {
        tickerInterval: 1000 * 15, // ms
        reductionOfTheTickerIntervalOnSpeedMode: 0.5, // <=> we reduce by 50% the ticker interval

        minPriceDifferenceToApproveNewPoint: 0.07, // <=> 0.1%
        smoothing: Smoothing.SAMPLE,

        // Pump & dump
        thresholdRateToApproveInversion: 1, // in %
        thresholdMaxRateToApproveInversion: 2, // in %
        numberOfUpPointsToValidatePump: 2,
        numberOfDownPointsToValidateDump: 3,
        validatePumpWhenBigPumpIsDetected: false,
        validateDumpWhenBigDumpIsDetected: true
    }
}

export default binanceConfig
