import Market from '../interfaces/market'
import config from '../../config';
import Chart from './chart';
import Equation from './equation';
import Point from './point';
import { Trend } from './trend.enum';
import { Subject } from 'rxjs/Subject';
import { ChartWork } from './chart-work';

class ChartWorker {
    chart: Chart
    market: Market
    lastTrend: Trend
    trend: Trend
    lastPrice: number
    price: number
    trend$: Subject<Trend>
    work$: Subject<ChartWork>
    tickerTimeout: NodeJS.Timer
    started: boolean

    constructor(market: Market) {
        this.market = market
        this.chart = new Chart()
        this.trend$ = new Subject()
        this.work$ = new Subject()
        this.started = false
    }

    workOnPriceTicker() {
        this.started = true
        const time = 0

        this.priceTickerWork(time)        
    }

    async priceTickerWork(time) {
        this.lastPrice = this.price
        this.price = await this.market.getCurrencyPrice()

        const lastPoint = this.chart.lastPoint()
        const newPoint = this.chart.createPoint(time, this.price)

        this.computeTrend(lastPoint, newPoint)
        this.notifyWork()

        this.tickerTimeout = setTimeout(() => this.priceTickerWork(time + config.trader.tickerInterval), config.trader.tickerInterval)
    }

    computeTrend(lastPoint, newPoint) {
        const leadingCoefficient = Equation.findLineLeadingCoefficient(lastPoint, newPoint)

        this.lastTrend = this.trend
        this.trend = this.determineTrend(leadingCoefficient)
    }

    notifyWork() {
        this.work$.next({
            lastPrice: this.lastPrice,
            price: this.price,
            lastTrend: this.lastTrend,
            trend: this.trend
        })
    }

    notifyTrend() {
        this.trend$.next(this.trend)
    }

    stopWorking() {
        if (this.tickerTimeout) {
            clearTimeout(this.tickerTimeout)
        }

        this.started = false
    }

    private determineTrend(leadingCoefficient: number): Trend {
        if (!Number.isFinite(leadingCoefficient)) {
            return null
        }

        if (leadingCoefficient === 0) {
            return Trend.FLAT
        } else if (leadingCoefficient > 0) {
            return Trend.UPWARD
        } else {
            return Trend.DOWNWARD;
        }
    }
}

export default ChartWorker