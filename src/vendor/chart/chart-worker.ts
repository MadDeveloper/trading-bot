import Market from '../interfaces/market'
import { config } from '../../config';
import Chart from './chart';
import Equation from './equation';
import Point from './point';
import { Trend } from './trend.enum';
import { Subject } from 'rxjs/Subject';
import { ChartWork } from './chart-work';
import { WorkerSpeed } from './worker-speed';
import Logger from '../logger/index';
import * as sleep from 'sleep'
import { Smoothing } from './smoothing';

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
    tickerInterval: number
    started: boolean
    lastId: number
    lastTime: number
    works: ChartWork[]
    allWorks: ChartWork[] // only different from .works property in debug mode
    lastWork: ChartWork
    mode: WorkerSpeed

    constructor(market: Market) {
        this.market = market
        this.chart = new Chart()
        this.trend$ = new Subject()
        this.works = []
        this.allWorks = []
        this.work$ = new Subject()
        this.started = false
        this.lastId = 0
        this.lastTime = 0
        this.tickerInterval = config.chart.tickerInterval
        this.mode = WorkerSpeed.NORMAL
    }

    workOnPriceTicker() {
        this.priceTickerWork(this.lastTime)        
    }

    async priceTickerWork(time: number) {
        this.lastTime = time
        this.lastPrice = this.price

        try {
            this.price = await this.market.getCurrencyPrice()
        } catch (error) {
            // Maybe network error, we stop worker and wait network connection back
            Logger.debug('Worker cannot retrieve currency price')
            Logger.debug(error)
            this.stopWorking()

            Logger.debug('Worker will rery until it can get the currency price')
            this.price = await this.retryUntilGetCurrencyPrice()
            Logger.debug('Worker has retrieved the currency price, it continues the work')
        }

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

        this.tickerTimeout = setTimeout(() => this.priceTickerWork(time + this.tickerInterval), this.tickerInterval)
    }

    fastMode() {
        if (this.mode !== WorkerSpeed.FAST) {
            if (this.tickerTimeout) {
                clearTimeout(this.tickerTimeout)
            }

            const lastTickerInterval = this.tickerInterval

            this.mode = WorkerSpeed.FAST
            this.tickerInterval = this.tickerInterval * (1 - config.chart.reductionOfTheTickerIntervalOnSpeedMode)
            this.priceTickerWork(this.lastTime + lastTickerInterval)
        }
    }

    normalMode() {
        if (this.mode !== WorkerSpeed.NORMAL) {
            if (this.tickerTimeout) {
                clearTimeout(this.tickerTimeout)
            }

            const lastTickerInterval = this.tickerInterval

            this.mode = WorkerSpeed.NORMAL
            this.tickerInterval = config.chart.tickerInterval
            this.priceTickerWork(this.lastTime + lastTickerInterval)
        }
    }

    isInFastMode(): boolean {
        return this.mode === WorkerSpeed.FAST
    }

    isInNormalMode(): boolean {
        return this.mode === WorkerSpeed.NORMAL
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
        const smooting = config.chart.smoothing

        switch (smooting) {
            case Smoothing.MOVING_AVERAGE:
                return this.removePointsTooClose(this.smoothMovingAverage(works))

            case Smoothing.SAMPLE:
            default:
                return this.removePointsTooClose(this.removeIsolatedBumpAndHollow(works))
        }
    }

    smoothMovingAverage(works: ChartWork[]): ChartWork[] {
        const numberOfWorks = works.length

        return works.map((work, index) => {
            const previousWork = this.findPreviousWork(work)
            const nextWork = this.findNextWork(work)
            let smoothedWork = { ...work }

            if (previousWork && nextWork) {
                smoothedWork.price = (previousWork.price + work.price + nextWork.price) / 3
            }

            return smoothedWork
        })
    }

    removePointsTooClose(works: ChartWork[]): ChartWork[] {
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

    startWorking() {
        if (this.tickerTimeout) {
            clearTimeout(this.tickerTimeout)
        }

        this.started = true
        this.workOnPriceTicker()

        Logger.debug('Worker is started')
    }

    stopWorking() {
        if (this.tickerTimeout) {
            clearTimeout(this.tickerTimeout)
        }

        this.started = false

        Logger.debug('Worker is stopped')
    }

    async retryUntilGetCurrencyPrice() {
        Logger.debug('Retry to get currency price')
        
        try {
            const price = await this.market.getCurrencyPrice()

            if (price) {
                return price
            }

            sleep.sleep(5)

            return this.retryUntilGetCurrencyPrice()
        } catch (error) {
            sleep.sleep(5)
            
            return this.retryUntilGetCurrencyPrice()
        }
    }

    copyWorks(): ChartWork[] {
        return this.works.slice().map(work => Object.assign({}, work))
    }

    prepareForNewWorks() {
        if (this.isInFastMode()) {
            this.normalMode()
        }

        this.clearWorks()
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

    findNextWork(work: ChartWork): ChartWork {
        let nextWork: ChartWork = null
        const numberOfWorks = this.works.length

        this.works.forEach((current, index) => {
            if (current.id === work.id && index < numberOfWorks - 1) {
                nextWork = this.works[index + 1]
            }
        })

        return nextWork
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