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
        tickerInterval: number, // ms
        thresholdDifferenceBetweenLastSellPrieAndNewBuyPrice: number
    },
    market: {
        instantOrderFees: number
    },
    chart: {
        rateToApproveVariation: number,
        thresholdRateToApproveInversion: number,
        minPriceDifferenceToApproveNewPoint: number
    }
}