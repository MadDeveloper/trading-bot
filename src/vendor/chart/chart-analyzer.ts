import { ChartWork } from './chart-work';
import Point from './point';
import { Trend } from './trend.enum';
import config from '../../config';
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

        Logger.debug(`downwardTrendConfirmed: ${downwardTrendConfirmed}`)
        Logger.debug(`upwardTrendConfirmed: ${upwardTrendConfirmed}`)

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

        Logger.debug(`upwardTrendConfirmed: ${upwardTrendConfirmed}`)
        Logger.debug(`downwardTrendConfirmed: ${downwardTrendConfirmed}`)

        return upwardTrendConfirmed && downwardTrendConfirmed
    }

    detectProfitablePump(works: ChartWork[], buyPrice: number): boolean {
        const thresholdPriceProfitable = Equation.thresholdPriceOfProbitability(buyPrice)
        const lastWork = works[works.length - 1]
        let profitablePump = false

        works.forEach(work => {
            if (!profitablePump) {
                profitablePump = (work.price >= thresholdPriceProfitable * (1 + config.trader.minProfitableRateWhenSelling)) && this.isUpwardTrendConfirmed(work)
            }
        })

        return profitablePump
    }

    isDownwardTrendConfirmed(work: ChartWork): boolean {
        return (work.trend === Trend.DOWNWARD && this.rateBetweenPricesConfirmTrend(work.lastPrice, work.price)) || this.trendsConfirmDownward(work)
    }

    isUpwardTrendConfirmed(work: ChartWork): boolean {
        return (work.trend === Trend.UPWARD && this.rateBetweenPricesConfirmTrend(work.lastPrice, work.price)) || this.trendsConfirmUpward(work)
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

    // private computePriceWithRateToApproveDownward(price) {
    //     return price * (1 - config.chart.rateToApproveVariation)
    // }

    // private computePriceWithRateToApproveUpward(price) {
    //     return price * (1 + config.chart.rateToApproveVariation)
    // }
}

export default ChartAnalyzer