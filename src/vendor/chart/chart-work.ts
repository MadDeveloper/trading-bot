import { Trend } from './trend.enum'

export interface ChartWork {
    trend: Trend
    lastTrend: Trend
    lastPrice: number
    price: number
    time: number
}