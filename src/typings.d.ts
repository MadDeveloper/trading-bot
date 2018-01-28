import { Currency } from './vendor/interfaces/currency.enum';
import { Smoothing } from './vendor/chart/smoothing';

declare interface Config {
    app: {
        debug: boolean
    }
    api: {
        key: string;
        secret: string;
        passphrase: string;
        uri: string;
        websocketURI: string;
        sandboxWebsocketURI: string;
        sandboxURI: string;
        sandbox: boolean;
    },
    trader: {
        quantityOfBaseCurrencyToUse: number, // in %
        quantityOfQuoteCurrencyToUse: number, // in %
        maxQuantityQuoteCurrencyToUse: number,
        minQuantityQuoteCurrencyToUse: number,
        minProfitableRateWhenSelling: number // in %
    },
    market: {
        currency: Currency,
        instantOrderFees: number
    },
    account: {
        baseCurrency: Currency
        quoteCurrency: Currency,
    },
    chart: {
        rateToApproveVariation: number,
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