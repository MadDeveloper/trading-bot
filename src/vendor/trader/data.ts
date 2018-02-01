import { ChartWork } from "../chart/chart-work";
import { Trade } from './trade';
import { Currency } from '../interfaces/currency.enum';

export interface DataStorage {
    works: ChartWork[]
    worksSmoothed: ChartWork[]
    trades: Trade[]
    baseCurrency: Currency
    baseCurrencyBalance: number
    quoteCurrency: Currency
    quoteCurrencyBalance: number
}