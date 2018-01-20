import Market from '../interfaces/market'
import config from '../../config';
import Chart from './chart';
import Equation from './equation';
import Point from './point';
import { Trend } from './trend.enum';
import { Subject } from 'rxjs/Subject';

class ChartWorker {
    chart: Chart
    market: Market
    tickerInterval: any
    lastTrend: Trend
    trend: Trend
    lastPrice: number
    price: number
    trend$: Subject<Trend>

    constructor(market: Market) {
        this.market = market
        this.chart = new Chart()
        this.trend$ = new Subject()

        this.trend$.next()
    }

    workOnPriceTicker() {
        let time = 0

        this.tickerInterval = setInterval(async () => {
            if (Number.isFinite(this.price)) {
                this.lastPrice = this.price
            }

            this.price = await this.market.getCurrencyPrice()

            const lastPoint = this.chart.lastPoint()
            const newPoint = this.chart.createPoint(time, this.price)

            if (this.lastPrice !== this.price && lastPoint) {
                const leadingCoefficient = Equation.findLineLeadingCoefficient(lastPoint, newPoint)
                
                if (this.trend !== undefined && this.trend !== null) {
                    this.lastTrend = this.trend
                }

                this.trend = this.determineTrend(leadingCoefficient)
                this.trend$.next(this.trend)
            }

            time += config.trader.tickerInterval
        }, config.trader.tickerInterval)
    }

    stopWorking() {
        if (this.tickerInterval) {
            clearInterval(this.tickerInterval)
        }
    }

    private determineTrend(leadingCoefficient: number): Trend {
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