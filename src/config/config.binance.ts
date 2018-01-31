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
        sandbox: true
    },
    trader: {
        // Quantities strategy
        quantityOfBaseCurrencyToUse: 100, // in % (BTC, ETH, LTC, ...)

        quantityOfQuoteCurrencyToUse: 100, // in % (€, $)
        maxQuantityQuoteCurrencyToUse: 0.0022, // 100€, 100 BTC (max quantity)
        minQuantityQuoteCurrencyToUse: 0.001, // 50€, 50 BTC
        
        // Probitability strategy & exit strategies
        sellWhenPriceExceedsMaxThresholdOfProfitability: true,
        maxThresholdOfProfitability: 0.3, // in %

        minProfitableRateWhenSelling: 0.1, // how many % profitability wanted when selling
        
        useExitStrategyInCaseOfLosses: true,
        sellWhenLossRateReaches: 10 // in %
    },
    market: {
        currency: Currency.PPTBTC,
        orderFees: 0.001 // <=> 0.1%
    },
    account: {
        quoteCurrency: Currency.BTC, // €, $, BTC
        baseCurrency: Currency.PPT // BTC, ETH, LTC, ...
    },
    chart: {
        tickerInterval: 1000 * 5, // ms
        reductionOfTheTickerIntervalOnSpeedMode: 0.5, // <=> we reduce by 50% the ticker interval

        minPriceDifferenceToApproveNewPoint: 0.003, // <=> 0.1%
        smoothing: Smoothing.SAMPLE,

        // Pump & dump
        thresholdRateToApproveInversion: 1, // in %
        thresholdMaxRateToApproveInversion: 2, // in %
        numberOfUpPointsToValidatePump: 2,
        numberOfDownPointsToValidateDump: 1,
        validatePumpWhenBigPumpIsDetected: false,
        validateDumpWhenBigDumpIsDetected: true
    }
}

export default binanceConfig