import { ChartWork } from './chart-work';
import Point from './point';
import { Trend } from './trend.enum';
import { config } from '../../config';
import Equation from './equation';
import Logger from '../logger/index';
import ChartWorker from './chart-worker';

class ChartAnalyzer {
    chartWorker: ChartWorker

    constructor(chartWorker: ChartWorker) {
        this.chartWorker = chartWorker
    }

    detectHollow(works: ChartWork[]): boolean {
        let downwardTrendConfirmed = false
        let upwardTrendConfirmed = false

        works.forEach(work => {
            if (downwardTrendConfirmed && !upwardTrendConfirmed && this.isUpwardTrendConfirmed(work, works) && !this.ignorePump(work)) {
                upwardTrendConfirmed = true
            } else if (!downwardTrendConfirmed && this.isDownwardTrendConfirmed(work, works)) {
                downwardTrendConfirmed = true
            }
        })

        Logger.debug(`\nHollow detected at: ${((Number(downwardTrendConfirmed) / 2) + (Number(upwardTrendConfirmed) / 2)) * 100}%`)

        return downwardTrendConfirmed && upwardTrendConfirmed
    }

    detectBump(works: ChartWork[]): boolean {
        let upwardTrendConfirmed = false
        let downwardTrendConfirmed = false

        works.forEach(work => {
            if (upwardTrendConfirmed && !downwardTrendConfirmed && this.isDownwardTrendConfirmed(work, works)) {
                downwardTrendConfirmed = true
            } else if (!upwardTrendConfirmed && this.isUpwardTrendConfirmed(work, works)) {
                upwardTrendConfirmed = true
            }
        })

        Logger.debug(`\Bump detected at: ${((Number(downwardTrendConfirmed) / 2) + (Number(upwardTrendConfirmed) / 2)) * 100}%`)

        return upwardTrendConfirmed && downwardTrendConfirmed
    }

    detectProfitablePump(works: ChartWork[], buyPrice: number): boolean {
        const thresholdPriceProfitable = Equation.thresholdPriceOfProfitability(buyPrice)
        const lastWork = works[works.length - 1]
        let profitablePump = false

        works.forEach(work => {
            if (!profitablePump) {
                profitablePump = work.price >= thresholdPriceProfitable && this.isUpwardTrendConfirmed(work, works)
            }
        })

        return profitablePump
    }

    isDownwardTrendConfirmed(work: ChartWork, works: ChartWork[]): boolean {
        return this.isBigDumpConfirmed(work) || this.trendsConfirmDownward(work, works)
    }

    isUpwardTrendConfirmed(work: ChartWork, works: ChartWork[]): boolean {
        return this.isBigPumpConfirmed(work) || this.trendsConfirmUpward(work, works)
    }

    ignorePump(work: ChartWork): boolean {
        return config.chart.ignoreBigPumpWhenBuying && Math.abs(Equation.rateBetweenValues(work.lastPrice, work.price)) > config.chart.thresholdMaxRateToApproveInversion
    }

    isBigDumpConfirmed(work): boolean {
        return config.chart.validateDumpWhenBigDumpIsDetected && work.trend === Trend.DOWNWARD && this.rateBetweenPricesConfirmTrend(work.lastPrice, work.price)
    }

    isBigPumpConfirmed(work): boolean {
        return config.chart.validatePumpWhenBigPumpIsDetected && work.trend === Trend.UPWARD && this.rateBetweenPricesConfirmTrend(work.lastPrice, work.price)
    }

    trendsConfirmDownward(work: ChartWork, works: ChartWork[]): boolean {
        // number of down needed to confirm downward trend, it is set in the config
        let lastWork = work
        let numberOfDownDetected = 0

        for (let index = 0; index < config.chart.numberOfDownPointsToValidateDump; index++) {
            if (lastWork) {
                if (lastWork.trend === Trend.DOWNWARD) {
                    ++numberOfDownDetected
                } else if (lastWork.trend === Trend.FLAT) {
                    // if the trend is flat, we ignore the point
                    index -= 1
                }

                lastWork = this.chartWorker.findPreviousWork(lastWork, works)
            }
        }

        return numberOfDownDetected >= config.chart.numberOfDownPointsToValidateDump
    }

    trendsConfirmUpward(work: ChartWork, works: ChartWork[]): boolean {
        // number of up needed to confirm upward trend, it is set in the config
        let lastWork = work
        let numberOfUpDetected = 0

        for (let index = 0; index < config.chart.numberOfUpPointsToValidatePump; index++) {
            if (lastWork) {
                if (lastWork.trend === Trend.UPWARD) {
                    ++numberOfUpDetected
                } else if (lastWork.trend === Trend.FLAT) {
                    // if the trend is flat, we ignore the point
                    index -= 1
                }

                lastWork = this.chartWorker.findPreviousWork(lastWork, works)
            }
        }

        return numberOfUpDetected >= config.chart.numberOfUpPointsToValidatePump
    }

    rateBetweenPricesConfirmTrend(priceA, priceB) {
        // High price difference confirms immediately a trend
        return Math.abs(Equation.rateBetweenValues(priceA, priceB)) >= config.chart.thresholdRateToApproveInversion
    }
}

export default ChartAnalyzer