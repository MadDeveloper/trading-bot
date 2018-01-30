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
        sandbox: true
    },
    trader: {
        quantityOfBaseCurrencyToUse: 100, // in % (BTC, ETH, LTC, ...)
        quantityOfQuoteCurrencyToUse: 100, // in % (€, $)
        maxQuantityQuoteCurrencyToUse: 0.0022, // 100€, 100 BTC (max quantity)
        minQuantityQuoteCurrencyToUse: 0.001, // 50€, 50 BTC
        minProfitableRateWhenSelling: 0, // how many % profitability wanted when selling

        // Strategies
        useExitStrategyInCaseOfLosses: true,
        sellWhenLossRateReaches: 0.1, // in %
        sellWhenPriceExceedsThresholdOfProfitability: true
    },
    market: {
        currency: Currency.DASHBTC,
        instantOrderFees: 0.001 // <=> 0.1%
    },
    account: {
        quoteCurrency: Currency.BTC, // €, $, BTC
        baseCurrency: Currency.DASH // BTC, ETH, LTC, ...
    },
    chart: {
        rateToApproveVariation: 0.0025, // <=> 0.25% FIXME: should it be still used?
        thresholdRateToApproveInversion: 0.4, // in %
        thresholdMaxRateToApproveInversion: 1, // in %
        minPriceDifferenceToApproveNewPoint: 0.05, // <=> 0.1%
        tickerInterval: 1000 * 15, // ms
        reductionOfTheTickerIntervalOnSpeedMode: 0.5, // <=> we reduce by 50% the ticker interval
        numberOfUpPointsToValidatePump: 2,
        numberOfDownPointsToValidateDump: 2,
        validatePumpWhenBigPumpIsDetected: true,
        validateDumpWhenBigDumpIsDetected: true,
        smoothing: Smoothing.SAMPLE
    }
}

export default binanceConfig