import { ChartWork } from './chart-work';
import Point from './point';
import { Trend } from './trend.enum';
import config from '../../config';

class ChartAnalyzer {
    containsHollow(works: ChartWork[]): boolean {
        let downwardTrendConfirmed = false
        let upwardTrendConfirmed = false

        works.forEach(work => {
            if (downwardTrendConfirmed && work.lastTrend === Trend.UPWARD && work.trend === Trend.UPWARD) {
                if (work.price >= this.computePriceWithThresholdToApproveUpward(work.lastPrice)) {
                    upwardTrendConfirmed = true
                }
            } else if (!downwardTrendConfirmed && work.lastTrend === Trend.DOWNWARD && work.trend === Trend.DOWNWARD) {
                if (work.price <= this.computePriceWithThresholdToApproveDownward(work.lastPrice)) {
                    downwardTrendConfirmed = true
                }
            }
        })

        return downwardTrendConfirmed && upwardTrendConfirmed
    }

    containsBump(works: ChartWork[]): boolean {
        let upwardTrendConfirmed = false
        let downwardTrendConfirmed = false

        works.forEach(work => {
            if (upwardTrendConfirmed && work.lastTrend === Trend.DOWNWARD && work.trend === Trend.DOWNWARD) {
                if (work.price <= this.computePriceWithThresholdToApproveDownward(work.lastPrice)) {
                    downwardTrendConfirmed = true
                }
            } else if (!upwardTrendConfirmed && work.lastTrend === Trend.UPWARD && work.trend === Trend.UPWARD) {
                if (work.price >= this.computePriceWithThresholdToApproveUpward(work.lastPrice)) {
                    upwardTrendConfirmed = true
                }
            }
        })

        return upwardTrendConfirmed && downwardTrendConfirmed
    }

    private computePriceWithThresholdToApproveDownward(price) {
        return price * (1 - config.chart.thresholdDifferenceToApproveVariation)
    }

    private computePriceWithThresholdToApproveUpward(price) {
        return price * (1 + config.chart.thresholdDifferenceToApproveVariation)
    }
}

export default ChartAnalyzer