import { Currency } from './vendor/interfaces/currency.enum';

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
        quantityOfQuoteCurrencyToUse: number
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
        reductionOfTheTickerIntervalOnSpeedMode: number
    }
}