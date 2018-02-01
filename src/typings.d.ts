import { Currency } from './vendor/interfaces/currency.enum';
import { Smoothing } from './vendor/chart/smoothing';
import { Platform } from './config/platform';

declare interface Config {
    app: {
        debug: boolean,
        platform: Platform
    },
    network: {
        retryIntervalWhenConnectionIsLost: number // ms
    },
    api: {
        key: string;
        secret: string;
        passphrase?: string;
        uri?: string;
        websocketURI?: string;
        sandboxWebsocketURI?: string;
        sandboxURI?: string;
        sandbox: boolean;
    },
    trader: {
        quantityOfBaseCurrencyToUse: number, // in %
        quantityOfQuoteCurrencyToUse: number, // in %
        maxQuantityQuoteCurrencyToUse: number,
        minQuantityQuoteCurrencyToUse: number,
        minThresholdOfProfitability: number, // in %

        // Strategies
        useExitStrategyInCaseOfLosses: boolean,
        sellWhenLossRateReaches: number, // in %
        sellWhenPriceExceedsMaxThresholdOfProfitability: boolean,
        sellWhenPriceExceedsMinThresholdOfProfitability: boolean,
        quantityToSellWhenPriceExceedsMinThresholdOfProfitability: number, // in %
        maxThresholdOfProfitability: number // in %
    },
    market: {
        currency: Currency,
        orderFees: number
    },
    account: {
        baseCurrency: Currency
        quoteCurrency: Currency,
    },
    chart: {
        thresholdRateToApproveInversion: number,
        thresholdMaxRateToApproveInversion: number,
        minPriceDifferenceToApproveNewPoint: number,
        tickerInterval: number, // ms
        reductionOfTheTickerIntervalOnSpeedMode: number,
        numberOfUpPointsToValidatePump: number,
        numberOfDownPointsToValidateDump: number,
        validatePumpWhenBigPumpIsDetected: boolean,
        validateDumpWhenBigDumpIsDetected: boolean,
        smoothing: Smoothing
    }
}