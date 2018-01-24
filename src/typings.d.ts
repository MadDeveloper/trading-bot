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
        tickerInterval: number // ms
    },
    market: {
        currency: Currency,
        instantOrderFees: number
    },
    account: {
        fiatCurrency: Currency,
        cryptoCurrency: Currency
    },
    chart: {
        rateToApproveVariation: number,
        thresholdRateToApproveInversion: number,
        thresholdMaxRateToApproveInversion: number,
        minPriceDifferenceToApproveNewPoint: number
    }
}