import { Currency } from '../interfaces/currency.enum';

export interface CurrencyInfo {
    symbol: Currency
    status: string
    baseAsset: Currency
    baseAssetPrecision: number
    quoteAsset: Currency
    quotePrecision: number
    orderTypes: 'LIMIT' | 'LIMIT_MAKER' | 'MARKET' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT'
    icebergAllowed: boolean
    filters: CurrencyFilter[]
}

export interface CurrencyFilter {
    filterType: 'PRICE_FILTER' | 'LOT_SIZE' | 'MIN_NOTIONAL'
    minPrice?: string
    maxPrice?: string
    tickSize?: string
    minQty?: string
    maxQty?: string
    stepSize?: string
    minNotional?: string
}