import { ChartWork } from '../chart/chart-work';
import { Currency } from '../interfaces/currency.enum';
import { Trade } from './trade';
import { TraderState } from './trader-state';

export interface DataStorage {
    state: TraderState
    works: ChartWork[]
    worksSmoothed: ChartWork[]
    trades: Trade[]
    nextMinProfitablePrice: number
    nextMaxProfitablePrice: number
    nextPanicSellPrice: number
    baseCurrency: Currency
    baseCurrencyBalance: number
    initialBaseCurrencyBalance: number
    quoteCurrency: Currency
    quoteCurrencyBalance: number
    initialQuoteCurrencyBalance: number
    startTime: Date
}