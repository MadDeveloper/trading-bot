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
import delay from 'delay'
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
        this.trend = null
        this.lastTrend = null
        this.lastPrice = null
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
        const copiedWork = { ...work }

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
            const previousWork = this.findPreviousWork(work, works)
            const nextWork = this.findNextWork(work, works)
            let smoothedWork = { ...work }

            if (previousWork && nextWork) {
                smoothedWork.price = (previousWork.price + work.price + nextWork.price) / 3
            }

            if (previousWork) {
                smoothedWork.lastTrend = previousWork.trend
                smoothedWork.trend = this.computeTrend(this.extractPointFromWork(previousWork), this.extractPointFromWork(smoothedWork))
            }

            return smoothedWork
        })
    }

    removePointsTooClose(works: ChartWork[]): ChartWork[] {
        let lastWorkKept: ChartWork

        return works.filter((work, index) => {
            if (index === 0 || !lastWorkKept) {
                // First point, we keep it
                lastWorkKept = { ...work }

                return true
            }

            if (Math.abs(Equation.rateBetweenValues(lastWorkKept.price, work.price)) > config.chart.minPriceDifferenceToApproveNewPoint) {
                const pointFromLastWorkKept = this.extractPointFromWork(lastWorkKept)
                const pointFromCurrentWork = this.extractPointFromWork(work)
                const newTrend = this.computeTrend(pointFromLastWorkKept, pointFromCurrentWork)
                
                work.lastTrend = lastWorkKept.trend
                work.trend = newTrend
                work.lastPrice = lastWorkKept.price
                lastWorkKept = { ...work }

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

            const previousWork = works[index - 1]
            const nextWork = works[index + 1]
            const isolatedBump = previousWork.trend === Trend.DOWNWARD && work.trend === Trend.UPWARD && nextWork.trend === Trend.DOWNWARD
            const isolatedHollow = previousWork.trend === Trend.UPWARD && work.trend === Trend.DOWNWARD && nextWork.trend === Trend.UPWARD

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

            await delay(5000)

            return this.retryUntilGetCurrencyPrice()
        } catch (error) {
            await delay(5000)
            
            return this.retryUntilGetCurrencyPrice()
        }
    }

    copyWorks(works: ChartWork[] = this.works): ChartWork[] {
        return works.slice().map(work => ({ ...work }))
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

    findPreviousWork(work: ChartWork, works: ChartWork[]): ChartWork {
        let previousWork: ChartWork = null

        works.forEach((current, index) => {
            if (current.id === work.id && index > 0) {
                previousWork = works[index - 1]
            }
        })

        return previousWork
    }

    findWork(work: ChartWork, works: ChartWork[]): ChartWork {
        let workFound: ChartWork = null

        works.forEach(current => {
            if (current.id === work.id) {
                workFound = current
            }
        })

        return workFound
    }

    findNextWork(work: ChartWork, works: ChartWork[]): ChartWork {
        let nextWork: ChartWork = null
        const numberOfWorks = works.length

        works.forEach((current, index) => {
            if (current.id === work.id && index < numberOfWorks - 1) {
                nextWork = works[index + 1]
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