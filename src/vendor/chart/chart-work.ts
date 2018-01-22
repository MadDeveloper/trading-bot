import { Trend } from './trend.enum'

export interface ChartWork {
    id: number
    trend: Trend
    lastTrend: Trend
    lastPrice: number
    price: number
    time: number
}