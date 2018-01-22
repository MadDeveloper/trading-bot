import { ChartWork } from './chart-work';
import Point from './point';
import { Trend } from './trend.enum';
import config from '../../config';
import Equation from './equation';
import ChartWorker from './chart-worker';

class ChartAnalyzer {
    chartWorker: ChartWorker

    constructor(chartWorker: ChartWorker) {
        this.chartWorker = chartWorker
    }

    containsHollow(originalWorks: ChartWork[]): boolean {
        const works = this.chartWorker.removeIsolatedBumpAndHollow(originalWorks.slice())
        let downwardTrendConfirmed = false
        let upwardTrendConfirmed = false

        works.forEach(work => {
            if (downwardTrendConfirmed && this.isUpwardTrendConfirmed(work)) {
                if (work.price >= this.computePriceWithRateToApproveUpward(work.lastPrice)) {
                    upwardTrendConfirmed = true
                    console.log(work)
                }
            } else if (!downwardTrendConfirmed && this.isDownwardTrendConfirmed(work)) {
                if (work.price <= this.computePriceWithRateToApproveDownward(work.lastPrice)) {
                    downwardTrendConfirmed = true
                    console.log(work)
                }
            }
        })

        console.log(`downwardTrendConfirmed: ${downwardTrendConfirmed}`)
        console.log(`upwardTrendConfirmed: ${upwardTrendConfirmed}`)

        return downwardTrendConfirmed && upwardTrendConfirmed
    }

    isDownwardTrendConfirmed(work: ChartWork): boolean {
        return this.rateBetweenPricesConfirmTrend(work.lastPrice, work.price) || this.trendsConfirmDownward(work)
    }

    isUpwardTrendConfirmed(work: ChartWork): boolean {
        return this.rateBetweenPricesConfirmTrend(work.lastPrice, work.price) || this.trendsConfirmUpward(work)
    }

    trendsConfirmDownward(work: ChartWork): boolean {
        // 2 down trend are needed to confirm downward trend 
        const previousWork = this.chartWorker.findPreviousWork(work)

        return (work.trend === Trend.DOWNWARD && (work.lastTrend === Trend.DOWNWARD || (work.lastTrend === Trend.FLAT && previousWork.lastTrend === Trend.DOWNWARD)))
    }

    trendsConfirmUpward(work: ChartWork): boolean {
        // 2 down trend are needed to confirm upward trend 
        const previousWork = this.chartWorker.findPreviousWork(work)

        return (work.trend === Trend.UPWARD && (work.lastTrend === Trend.UPWARD || (work.lastTrend === Trend.FLAT && previousWork.lastTrend === Trend.UPWARD)))
    }

    rateBetweenPricesConfirmTrend(priceA, priceB) {
        // High price difference confirms immediately a trend
        return Math.abs(Equation.rateBetweenValues(priceA, priceB)) >= config.chart.thresholdRateToApproveInversion
    }

    containsBump(originalWorks: ChartWork[]): boolean {
        const works = this.chartWorker.removeIsolatedBumpAndHollow(originalWorks.slice())
        let upwardTrendConfirmed = false
        let downwardTrendConfirmed = false

        works.forEach(work => {
            if (upwardTrendConfirmed && work.lastTrend !== Trend.UPWARD && work.trend !== Trend.UPWARD) {
                if (work.price <= this.computePriceWithRateToApproveDownward(work.lastPrice)) {
                    downwardTrendConfirmed = true
                }
            } else if (!upwardTrendConfirmed && work.lastTrend !== Trend.DOWNWARD && work.trend !== Trend.DOWNWARD) {
                if (work.price >= this.computePriceWithRateToApproveUpward(work.lastPrice)) {
                    upwardTrendConfirmed = true
                }
            }
        })

        console.log(`upwardTrendConfirmed: ${upwardTrendConfirmed}`)
        console.log(`downwardTrendConfirmed: ${downwardTrendConfirmed}`)

        return upwardTrendConfirmed && downwardTrendConfirmed
    }

    private computePriceWithRateToApproveDownward(price) {
        return price * (1 - config.chart.rateToApproveVariation)
    }

    private computePriceWithRateToApproveUpward(price) {
        return price * (1 + config.chart.rateToApproveVariation)
    }
}

export default ChartAnalyzer