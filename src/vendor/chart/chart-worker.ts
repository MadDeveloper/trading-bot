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
    lastId: number
    works: ChartWork[]
    allWorks: ChartWork[] // only different from .works property in debug mode
    lastWork: ChartWork

    constructor(market: Market) {
        this.market = market
        this.chart = new Chart()
        this.trend$ = new Subject()
        this.works = []
        this.allWorks = []
        this.work$ = new Subject()
        this.started = false
        this.lastId = 0
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

        this.lastTrend = this.trend
        this.trend = this.computeTrend(lastPoint, newPoint)
        this.lastWork = {
            id: this.lastId++,
            lastPrice: this.lastPrice,
            price: this.price,
            lastTrend: this.lastTrend,
            trend: this.trend,
            time
        }
        this.notifyWork(this.lastWork)

        this.tickerTimeout = setTimeout(() => this.priceTickerWork(time + config.trader.tickerInterval), config.trader.tickerInterval)
    }

    computeTrend(lastPoint, newPoint): number {
        const leadingCoefficient = Equation.findLineLeadingCoefficient(lastPoint, newPoint)

        return this.determineTrend(leadingCoefficient)
    }

    notifyWork(work: ChartWork) {
        const copiedWork = Object.assign({}, work)

        this.works.push(copiedWork)
        this.allWorks.push(copiedWork)
        this.work$.next(copiedWork)
    }

    notifyTrend() {
        this.trend$.next(this.trend)
    }

    filterNoise(works: ChartWork[]): ChartWork[] {
        return this.smoothCurve(this.removeIsolatedBumpAndHollow(works))
    }

    smoothCurve(works: ChartWork[]): ChartWork[] {
        let lastWorkKept: ChartWork

        return works.filter((work, index) => {
            if (index === 0 || !lastWorkKept) {
                // First point, we keep it
                lastWorkKept = Object.assign({}, work)

                return true
            }

            if (Math.abs(Equation.rateBetweenValues(lastWorkKept.price, work.price)) > config.chart.minPriceDifferenceToApproveNewPoint) {
                const pointFromLastWorkKept = this.extractPointFromWork(lastWorkKept)
                const pointFromCurrentWork = this.extractPointFromWork(work)
                const newTrend = this.computeTrend(pointFromLastWorkKept, pointFromCurrentWork)
                
                work.lastTrend = lastWorkKept.trend
                work.trend = newTrend
                work.lastPrice = lastWorkKept.price
                lastWorkKept = Object.assign({}, work)

                return true
            }

            return false
        })
    }

    removeIsolatedBumpAndHollow(works: ChartWork[]): ChartWork[] {
        const worksLength = works.length

        return works.filter((work, index) => {
            if (index === 0 || index === worksLength - 1) {
                return true // we keep the first and the last point
            }

            const nextWork = works[index + 1]
            const isolatedBump = work.trend === Trend.UPWARD && nextWork.trend === Trend.DOWNWARD
            const isolatedHollow = work.trend === Trend.DOWNWARD && nextWork.trend === Trend.UPWARD

            return !isolatedBump && !isolatedHollow
        })
    }

    extractPointFromWork(work: ChartWork): Point {
        return {
            x: work.time,
            y: work.price
        }
    }

    recreateWorksTimeline(works: ChartWork[]): ChartWork[] {
        let id = 0
        let time = 0

        return works.map(work => {
            const newWork = Object.assign({}, work, {
                id: id++,
                time: time
            })

            time += config.trader.tickerInterval

            return newWork
        })
    }

    stopWorking() {
        if (this.tickerTimeout) {
            clearTimeout(this.tickerTimeout)
        }

        this.started = false
    }

    copyWorks(): ChartWork[] {
        return this.works.slice().map(work => Object.assign({}, work))
    }

    clearWorks() {
        this.works = []
    }

    findPreviousWork(work: ChartWork): ChartWork {
        let previousWork: ChartWork = null

        this.works.forEach((current, index) => {
            if (current.id === work.id && index > 0) {
                previousWork = this.works[index - 1]
            }
        })

        return previousWork
    }

    findWork(work: ChartWork): ChartWork {
        let workFound: ChartWork = null

        this.works.forEach(current => {
            if (current.id === work.id) {
                workFound = current
            }
        })

        return workFound
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