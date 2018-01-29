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
            if (downwardTrendConfirmed && !upwardTrendConfirmed && this.isUpwardTrendConfirmed(work)) {
                // if (work.price >= this.computePriceWithRateToApproveUpward(work.lastPrice)) {
                upwardTrendConfirmed = true
                // }
            } else if (!downwardTrendConfirmed && this.isDownwardTrendConfirmed(work)) {
                // if (work.price <= this.computePriceWithRateToApproveDownward(work.lastPrice)) {
                downwardTrendConfirmed = true
                // }
            }
        })

        Logger.debug(`\nHollow detected at: ${((Number(downwardTrendConfirmed) / 2) + (Number(upwardTrendConfirmed) / 2)) * 100}%`)

        return downwardTrendConfirmed && upwardTrendConfirmed
    }

    detectBump(works: ChartWork[]): boolean {
        let upwardTrendConfirmed = false
        let downwardTrendConfirmed = false

        works.forEach(work => {
            if (upwardTrendConfirmed && !downwardTrendConfirmed && this.isDownwardTrendConfirmed(work)) {
                // if (work.price <= this.computePriceWithRateToApproveDownward(work.lastPrice)) {
                downwardTrendConfirmed = true
                // }
            } else if (!upwardTrendConfirmed && this.isUpwardTrendConfirmed(work)) {
                // if (work.price >= this.computePriceWithRateToApproveUpward(work.lastPrice)) {
                upwardTrendConfirmed = true
                // }
            }
        })

        Logger.debug(`\Bump detected at: ${((Number(downwardTrendConfirmed) / 2) + (Number(upwardTrendConfirmed) / 2)) * 100}%`)

        return upwardTrendConfirmed && downwardTrendConfirmed
    }

    detectProfitablePump(works: ChartWork[], buyPrice: number): boolean {
        const thresholdPriceProfitable = Equation.thresholdPriceOfProbitability(buyPrice)
        const lastWork = works[works.length - 1]
        let profitablePump = false

        works.forEach(work => {
            if (!profitablePump) {
                profitablePump = work.price >= thresholdPriceProfitable && this.isUpwardTrendConfirmed(work)
            }
        })

        return profitablePump
    }

    isDownwardTrendConfirmed(work: ChartWork): boolean {
        return this.isBigDumpConfirmed(work) || this.trendsConfirmDownward(work)
    }

    isUpwardTrendConfirmed(work: ChartWork): boolean {
        return this.isBigPumpConfirmed(work) || this.trendsConfirmUpward(work)
    }

    isBigDumpConfirmed(work): boolean {
        return config.chart.validateDumpWhenBigDumpIsDetected && (work.trend === Trend.DOWNWARD && this.rateBetweenPricesConfirmTrend(work.lastPrice, work.price))
    }

    isBigPumpConfirmed(work): boolean {
        return config.chart.validatePumpWhenBigPumpIsDetected && (work.trend === Trend.UPWARD && this.rateBetweenPricesConfirmTrend(work.lastPrice, work.price))
    }

    trendsConfirmDownward(work: ChartWork): boolean {
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

                lastWork = this.chartWorker.findPreviousWork(lastWork)
            }
        }

        return numberOfDownDetected >= config.chart.numberOfDownPointsToValidateDump
    }

    trendsConfirmUpward(work: ChartWork): boolean {
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

                lastWork = this.chartWorker.findPreviousWork(lastWork)
            }
        }

        return numberOfUpDetected >= config.chart.numberOfUpPointsToValidatePump
    }

    rateBetweenPricesConfirmTrend(priceA, priceB) {
        // High price difference confirms immediately a trend
        return Math.abs(Equation.rateBetweenValues(priceA, priceB)) >= config.chart.thresholdRateToApproveInversion
    }

    // private computePriceWithRateToApproveDownward(price) {
    //     return price * (1 - config.chart.rateToApproveVariation)
    // }

    // private computePriceWithRateToApproveUpward(price) {
    //     return price * (1 + config.chart.rateToApproveVariation)
    // }
}

export default ChartAnalyzer