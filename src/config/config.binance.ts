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
        retryIntervalWhenConnectionIsLost: 3000 // ms
    },
    api: {
        sandbox: true
    },
    trader: {
        // Quantities strategy
        quantityOfBaseCurrencyToUse: 100, // in % (BTC, ETH, LTC, ...)
        quantityOfQuoteCurrencyToUse: 100, // in % (€, $)
        maxQuantityQuoteCurrencyToUse: 0.0022, // 100€, 100 BTC (max quantity)
        minQuantityQuoteCurrencyToUse: 0.001, // 50€, 50 BTC
        
        // Probitability strategy & exit strategies

        // Max threshold
        sellWhenPriceExceedsMaxThresholdOfProfitability: true,
        maxThresholdOfProfitability: 0.8, // in %
        
        // Min threshold
        sellWhenPriceExceedsMinThresholdOfProfitability: true,
        minThresholdOfProfitability: 0.4, // how many % profitability wanted when selling
        quantityToSellWhenPriceExceedsMinThresholdOfProfitability: 25, // in %

        useExitStrategyInCaseOfLosses: true,
        sellWhenLossRateReaches: 1.5 // in %
    },
    market: {
        currency: Currency.NEBLBTC,
        orderFees: 0.0003 // <=> 0.1%
    },
    account: {
        quoteCurrency: Currency.BTC, // €, $, BTC
        baseCurrency: Currency.NEBL // BTC, ETH, LTC, ...
    },
    chart: {
        tickerInterval: 1000 * 15, // ms
        reductionOfTheTickerIntervalOnSpeedMode: 0.5, // <=> we reduce by 50% the ticker interval

        minPriceDifferenceToApproveNewPoint: 0.09, // in %. <=> 0.1%
        smoothing: Smoothing.MOVING_AVERAGE,

        // Pump & dump
        thresholdRateToApproveInversion: 0.6, // in % (Pump/Dump)
        thresholdMaxRateToApproveInversion: 1, // in % (Pump/Dump)
        numberOfUpPointsToValidatePump: 3,
        numberOfDownPointsToValidateDump: 3,
        validatePumpWhenBigPumpIsDetected: false,
        ignoreBigPumpWhenBuying: true, // when price rate between two points exceeds thresholdMaxRateToApproveInversion
        validateDumpWhenBigDumpIsDetected: false
    }
}

export default binanceConfig
