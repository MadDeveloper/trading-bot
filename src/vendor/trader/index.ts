import Accounts from '../market/accounts';
import ChartWorker from '../chart/chart-worker';
import config from '../../config';
import Market from '../interfaces/market';
import Order from '../interfaces/order';
import Trading from '../interfaces/trader';
import { ChartWork } from '../chart/chart-work';
import { Currency } from '../interfaces/currency.enum';
import { Subscription } from 'rxjs/Subscription';
import { TraderState } from './trader-state';
import { Trend } from '../chart/trend.enum';
import ChartAnalyzer from '../chart/chart-analyzer';
import { Trade } from './trade';
import { TradeType } from './trade-type';
import Equation from '../chart/equation';

class Trader implements Trading {
    market: Market
    accounts: Accounts
    chartWorker: ChartWorker
    workObserver: Subscription
    worksStored: ChartWork[]
    state: TraderState
    chartAnalyzer: ChartAnalyzer
    fiatCurrencyAmountAvailable: number // €, $, £, etc.
    currencyAmountAvailable: number // BTC, ETH, LTC, etc.

    trades: Trade[]
    lastTrade: Trade

    private priceObserver: Subscription

    constructor(market: Market) {
        this.market = market
        this.accounts = market.accounts
        this.chartWorker = new ChartWorker(market)
        this.worksStored = []
        this.trades = []
        this.state = TraderState.WAITING_TO_BUY
        this.chartAnalyzer = new ChartAnalyzer(this.chartWorker)
        this.fiatCurrencyAmountAvailable = 100
        this.trades = []
    }

    async trade() {
        if (!this.market.currency) {
            console.error('Currency is not set, stopping trading.')
            this.stop()
        }

        this.watchChartWorker()
        this.chartWorker.workOnPriceTicker()

        const worksContainingHollow: ChartWork[] = [
            {
                id: 1,
                lastPrice: 1,
                lastTrend: Trend.DOWNWARD,
                price: .9,
                trend: Trend.DOWNWARD,
                time: 0
            },
            {
                id: 2,
                lastPrice: .9,
                lastTrend: Trend.DOWNWARD,
                price: .8,
                trend: Trend.DOWNWARD,
                time: 1000
            },
            {
                id: 3,
                lastPrice: .8,
                lastTrend: Trend.DOWNWARD,
                price: .8,
                trend: Trend.FLAT,
                time: 2000
            },
            {
                id: 4,
                lastPrice: .8,
                lastTrend: Trend.FLAT,
                price: .9,
                trend: Trend.UPWARD,
                time: 3000
            },
            {
                id: 5,
                lastPrice: .9,
                lastTrend: Trend.UPWARD,
                price: 1,
                trend: Trend.UPWARD,
                time: 4000
            },
            {
                id: 6,
                lastPrice: 1,
                lastTrend: Trend.UPWARD,
                price: 1.1,
                trend: Trend.UPWARD,
                time: 5000
            }
        ]
        const worksContainingBump: ChartWork[] = [
            {
                id: 1,
                lastPrice: 1,
                lastTrend: Trend.UPWARD,
                price: 1.1,
                trend: Trend.UPWARD,
                time: 0
            },
            {
                id: 2,
                lastPrice: 1.1,
                lastTrend: Trend.UPWARD,
                price: 1.2,
                trend: Trend.UPWARD,
                time: 1000
            },
            {
                id: 3,
                lastPrice: 1.2,
                lastTrend: Trend.DOWNWARD,
                price: 1.2,
                trend: Trend.FLAT,
                time: 2000
            },
            {
                id: 4,
                lastPrice: 1.2,
                lastTrend: Trend.FLAT,
                price: 1.1,
                trend: Trend.DOWNWARD,
                time: 3000
            },
            {
                id: 5,
                lastPrice: 1.1,
                lastTrend: Trend.DOWNWARD,
                price: 1,
                trend: Trend.DOWNWARD,
                time: 4000
            },
            {
                id: 6,
                lastPrice: 1,
                lastTrend: Trend.DOWNWARD,
                price: .9,
                trend: Trend.DOWNWARD,
                time: 5000
            }
        ]
        const realDataHarvested = [
            {
                lastPrice: undefined,
                price: 9817,
                lastTrend: undefined,
                trend: null,
                time: 0
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: null,
                trend: 2,
                time: 60000
            },
            {
                lastPrice: 9817,
                price: 9816.99,
                lastTrend: 2,
                trend: 1,
                time: 120000
            },
            {
                lastPrice: 9816.99,
                price: 9817,
                lastTrend: 1,
                trend: 0,
                time: 180000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 0,
                trend: 2,
                time: 240000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 300000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 360000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 420000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 480000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 540000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 600000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 660000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 720000
            },
            {
                lastPrice: 9817,
                price: 9817,
                lastTrend: 2,
                trend: 2,
                time: 780000
            },
            {
                lastPrice: 9817,
                price: 9806.55,
                lastTrend: 2,
                trend: 1,
                time: 840000
            },
            {
                lastPrice: 9806.55,
                price: 9813.44,
                lastTrend: 1,
                trend: 0,
                time: 900000
            },
            {
                lastPrice: 9813.44,
                price: 9813.43,
                lastTrend: 0,
                trend: 1,
                time: 960000
            },
            {
                lastPrice: 9813.43,
                price: 9820,
                lastTrend: 1,
                trend: 0,
                time: 1020000
            },
            {
                lastPrice: 9820,
                price: 9838.95,
                lastTrend: 0,
                trend: 0,
                time: 1080000
            },
            {
                lastPrice: 9838.95,
                price: 9849.99,
                lastTrend: 0,
                trend: 0,
                time: 1140000
            },
            {
                lastPrice: 9849.99,
                price: 9850,
                lastTrend: 0,
                trend: 0,
                time: 1200000
            },
            {
                lastPrice: 9850,
                price: 9851,
                lastTrend: 0,
                trend: 0,
                time: 1260000
            },
            {
                lastPrice: 9851,
                price: 9850.79,
                lastTrend: 0,
                trend: 1,
                time: 1320000
            },
            {
                lastPrice: 9850.79,
                price: 9825.97,
                lastTrend: 1,
                trend: 1,
                time: 1380000
            },
            {
                lastPrice: 9825.97,
                price: 9844.3,
                lastTrend: 1,
                trend: 0,
                time: 1440000
            },
            {
                lastPrice: 9844.3,
                price: 9826.65,
                lastTrend: 0,
                trend: 1,
                time: 1500000
            },
            {
                lastPrice: 9826.65,
                price: 9826.96,
                lastTrend: 1,
                trend: 0,
                time: 1560000
            },
            {
                lastPrice: 9826.96,
                price: 9826.96,
                lastTrend: 0,
                trend: 2,
                time: 1620000
            },
            {
                lastPrice: 9826.96,
                price: 9826.95,
                lastTrend: 2,
                trend: 1,
                time: 1680000
            },
            {
                lastPrice: 9826.95,
                price: 9826.95,
                lastTrend: 1,
                trend: 2,
                time: 1740000
            },
            {
                lastPrice: 9826.95,
                price: 9826.95,
                lastTrend: 2,
                trend: 2,
                time: 1800000
            },
            {
                lastPrice: 9826.95,
                price: 9826.96,
                lastTrend: 2,
                trend: 0,
                time: 1860000
            },
            {
                lastPrice: 9826.96,
                price: 9826.96,
                lastTrend: 0,
                trend: 2,
                time: 1920000
            },
            {
                lastPrice: 9826.96,
                price: 9826.95,
                lastTrend: 2,
                trend: 1,
                time: 1980000
            },
            {
                lastPrice: 9826.95,
                price: 9826.96,
                lastTrend: 1,
                trend: 0,
                time: 2040000
            },
            {
                lastPrice: 9826.96,
                price: 9826.95,
                lastTrend: 0,
                trend: 1,
                time: 2100000
            },
            {
                lastPrice: 9826.95,
                price: 9826.95,
                lastTrend: 1,
                trend: 2,
                time: 2160000
            },
            {
                lastPrice: 9826.95,
                price: 9826.95,
                lastTrend: 2,
                trend: 2,
                time: 2220000
            },
            {
                lastPrice: 9826.95,
                price: 9826.95,
                lastTrend: 2,
                trend: 2,
                time: 2280000
            },
            {
                lastPrice: 9826.95,
                price: 9794.12,
                lastTrend: 2,
                trend: 1,
                time: 2340000
            },
            {
                lastPrice: 9794.12,
                price: 9794.11,
                lastTrend: 1,
                trend: 1,
                time: 2400000
            },
            {
                lastPrice: 9794.11,
                price: 9780.4,
                lastTrend: 1,
                trend: 1,
                time: 2460000
            },
            {
                lastPrice: 9780.4,
                price: 9780.39,
                lastTrend: 1,
                trend: 1,
                time: 2520000
            },
            {
                lastPrice: 9780.39,
                price: 9777.34,
                lastTrend: 1,
                trend: 1,
                time: 2580000
            },
            {
                lastPrice: 9777.34,
                price: 9755.76,
                lastTrend: 1,
                trend: 1,
                time: 0
            },
            {
                lastPrice: 9755.76,
                price: 9761.28,
                lastTrend: 1,
                trend: 0,
                time: 60000
            },
            {
                lastPrice: 9761.28,
                price: 9749.51,
                lastTrend: 0,
                trend: 1,
                time: 120000
            },
            {
                lastPrice: 9749.51,
                price: 9745,
                lastTrend: 1,
                trend: 1,
                time: 180000
            },
            {
                lastPrice: 9745,
                price: 9750.4,
                lastTrend: 1,
                trend: 0,
                time: 240000
            },
            {
                lastPrice: 9750.4,
                price: 9745.01,
                lastTrend: 0,
                trend: 1,
                time: 300000
            },
            {
                lastPrice: 9745.01,
                price: 9745.01,
                lastTrend: 1,
                trend: 2,
                time: 360000
            },
            {
                lastPrice: 9745.01,
                price: 9769.99,
                lastTrend: 2,
                trend: 0,
                time: 420000
            },
            {
                lastPrice: 9769.99,
                price: 9789.67,
                lastTrend: 0,
                trend: 0,
                time: 480000
            },
            {
                lastPrice: 9789.67,
                price: 9792.84,
                lastTrend: 0,
                trend: 0,
                time: 540000
            },
            {
                lastPrice: 9792.84,
                price: 9792.85,
                lastTrend: 0,
                trend: 0,
                time: 600000
            },
            {
                lastPrice: 9792.85,
                price: 9795.71,
                lastTrend: 0,
                trend: 0,
                time: 660000
            },
            {
                lastPrice: 9795.71,
                price: 9765.64,
                lastTrend: 0,
                trend: 1,
                time: 720000
            },
            {
                lastPrice: 9765.64,
                price: 9771.43,
                lastTrend: 1,
                trend: 0,
                time: 780000
            },
            {
                lastPrice: 9771.43,
                price: 9737.74,
                lastTrend: 0,
                trend: 1,
                time: 840000
            },
            {
                lastPrice: 9737.74,
                price: 9744.52,
                lastTrend: 1,
                trend: 0,
                time: 900000
            },
            {
                lastPrice: 9744.52,
                price: 9743.33,
                lastTrend: 0,
                trend: 1,
                time: 960000
            },
            {
                lastPrice: 9743.33,
                price: 9753.52,
                lastTrend: 1,
                trend: 0,
                time: 1020000
            },
            {
                lastPrice: 9753.52,
                price: 9759.66,
                lastTrend: 0,
                trend: 0,
                time: 1080000
            },
            {
                lastPrice: 9759.66,
                price: 9739.21,
                lastTrend: 0,
                trend: 1,
                time: 1140000
            },
            {
                lastPrice: 9739.21,
                price: 9750.66,
                lastTrend: 1,
                trend: 0,
                time: 1200000
            },
            {
                lastPrice: 9750.66,
                price: 9768.04,
                lastTrend: 0,
                trend: 0,
                time: 1260000
            },
            {
                lastPrice: 9768.04,
                price: 9765.48,
                lastTrend: 0,
                trend: 1,
                time: 1320000
            },
            {
                lastPrice: 9765.48,
                price: 9765.46,
                lastTrend: 1,
                trend: 1,
                time: 1380000
            },
            {
                lastPrice: 9765.46,
                price: 9765.45,
                lastTrend: 1,
                trend: 1,
                time: 1440000
            },
            {
                lastPrice: 9765.45,
                price: 9765.46,
                lastTrend: 1,
                trend: 0,
                time: 1500000
            },
            {
                lastPrice: 9765.46,
                price: 9752.3,
                lastTrend: 0,
                trend: 1,
                time: 1560000
            },
            {
                lastPrice: 9752.3,
                price: 9752.01,
                lastTrend: 1,
                trend: 1,
                time: 1620000
            },
            {
                lastPrice: 9752.01,
                price: 9752.01,
                lastTrend: 1,
                trend: 2,
                time: 1680000
            },
            {
                lastPrice: 9752.01,
                price: 9753,
                lastTrend: 2,
                trend: 0,
                time: 1740000
            },
            {
                lastPrice: 9753,
                price: 9760.18,
                lastTrend: 0,
                trend: 0,
                time: 1800000
            },
            {
                lastPrice: 9760.18,
                price: 9760.18,
                lastTrend: 0,
                trend: 2,
                time: 1860000
            },
            {
                lastPrice: 9760.18,
                price: 9752.01,
                lastTrend: 2,
                trend: 1,
                time: 1920000
            },
            {
                lastPrice: 9752.01,
                price: 9752.01,
                lastTrend: 1,
                trend: 2,
                time: 1980000
            },
            {
                lastPrice: 9752.01,
                price: 9752,
                lastTrend: 2,
                trend: 1,
                time: 2040000
            },
            {
                lastPrice: 9752,
                price: 9752.02,
                lastTrend: 1,
                trend: 0,
                time: 2100000
            },
            {
                lastPrice: 9752.02,
                price: 9751.98,
                lastTrend: 0,
                trend: 1,
                time: 2160000
            },
            {
                lastPrice: 9751.98,
                price: 9751.98,
                lastTrend: 1,
                trend: 2,
                time: 2220000
            },
            {
                lastPrice: 9751.98,
                price: 9749.32,
                lastTrend: 2,
                trend: 1,
                time: 2280000
            },
            {
                lastPrice: 9749.32,
                price: 9749.32,
                lastTrend: 1,
                trend: 2,
                time: 2340000
            },
            {
                lastPrice: 9749.32,
                price: 9750.3,
                lastTrend: 2,
                trend: 0,
                time: 2400000
            },
            {
                lastPrice: 9750.3,
                price: 9750.31,
                lastTrend: 0,
                trend: 0,
                time: 2460000
            },
            {
                lastPrice: 9750.31,
                price: 9745.85,
                lastTrend: 0,
                trend: 1,
                time: 2520000
            },
            {
                lastPrice: 9745.85,
                price: 9729.02,
                lastTrend: 1,
                trend: 1,
                time: 2580000
            },
            {
                lastPrice: 9729.02,
                price: 9720.95,
                lastTrend: 1,
                trend: 1,
                time: 2640000
            },
            {
                lastPrice: 9720.95,
                price: 9718.04,
                lastTrend: 1,
                trend: 1,
                time: 2700000
            },
            {
                lastPrice: 9718.04,
                price: 9739.4,
                lastTrend: 1,
                trend: 0,
                time: 2760000
            },
            {
                lastPrice: 9739.4,
                price: 9715,
                lastTrend: 0,
                trend: 1,
                time: 2820000
            },
            {
                lastPrice: 9715,
                price: 9715,
                lastTrend: 1,
                trend: 2,
                time: 2880000
            },
            {
                lastPrice: 9715,
                price: 9715.01,
                lastTrend: 2,
                trend: 0,
                time: 2940000
            },
            {
                lastPrice: 9715.01,
                price: 9715.01,
                lastTrend: 0,
                trend: 2,
                time: 3000000
            },
            {
                lastPrice: 9715.01,
                price: 9715,
                lastTrend: 2,
                trend: 1,
                time: 3060000
            },
            {
                lastPrice: 9715,
                price: 9715.01,
                lastTrend: 1,
                trend: 0,
                time: 3120000
            },
            {
                lastPrice: 9715.01,
                price: 9711,
                lastTrend: 0,
                trend: 1,
                time: 3180000
            },
            {
                lastPrice: 9711,
                price: 9697.93,
                lastTrend: 1,
                trend: 1,
                time: 3240000
            },
            {
                lastPrice: 9697.93,
                price: 9648.29,
                lastTrend: 1,
                trend: 1,
                time: 3300000
            },
            {
                lastPrice: 9648.29,
                price: 9645.01,
                lastTrend: 1,
                trend: 1,
                time: 3360000
            },
            {
                lastPrice: 9645.01,
                price: 9635.01,
                lastTrend: 1,
                trend: 1,
                time: 3420000
            },
            {
                lastPrice: 9635.01,
                price: 9635.01,
                lastTrend: 1,
                trend: 2,
                time: 3480000
            },
            {
                lastPrice: 9635.01,
                price: 9588.4,
                lastTrend: 2,
                trend: 1,
                time: 3540000
            },
            {
                lastPrice: 9588.4,
                price: 9594.98,
                lastTrend: 1,
                trend: 0,
                time: 3600000
            },
            {
                lastPrice: 9594.98,
                price: 9591.38,
                lastTrend: 0,
                trend: 1,
                time: 3660000
            },
            {
                lastPrice: 9591.38,
                price: 9595,
                lastTrend: 1,
                trend: 0,
                time: 3720000
            },
            {
                lastPrice: 9595,
                price: 9590.01,
                lastTrend: 0,
                trend: 1,
                time: 3780000
            },
            {
                lastPrice: 9590.01,
                price: 9590.01,
                lastTrend: 1,
                trend: 2,
                time: 3840000
            },
            {
                lastPrice: 9590.01,
                price: 9590,
                lastTrend: 2,
                trend: 1,
                time: 3900000
            },
            {
                lastPrice: 9590,
                price: 9580.01,
                lastTrend: 1,
                trend: 1,
                time: 3960000
            },
            {
                lastPrice: 9580.01,
                price: 9580,
                lastTrend: 1,
                trend: 1,
                time: 4020000
            },
            {
                lastPrice: 9580,
                price: 9543.05,
                lastTrend: 1,
                trend: 1,
                time: 4080000
            },
            {
                lastPrice: 9543.05,
                price: 9530.29,
                lastTrend: 1,
                trend: 1,
                time: 4140000
            },
            {
                lastPrice: 9530.29,
                price: 9521.29,
                lastTrend: 1,
                trend: 1,
                time: 4200000
            },
            {
                lastPrice: 9521.29,
                price: 9550,
                lastTrend: 1,
                trend: 0,
                time: 4260000
            },
            {
                lastPrice: 9550,
                price: 9555.1,
                lastTrend: 0,
                trend: 0,
                time: 4320000
            },
            {
                lastPrice: 9555.1,
                price: 9560,
                lastTrend: 0,
                trend: 0,
                time: 4380000
            },
            {
                lastPrice: 9560,
                price: 9559.01,
                lastTrend: 0,
                trend: 1,
                time: 4440000
            },
            {
                lastPrice: 9559.01,
                price: 9551.01,
                lastTrend: 1,
                trend: 1,
                time: 4500000
            },
            {
                lastPrice: 9551.01,
                price: 9567.03,
                lastTrend: 1,
                trend: 0,
                time: 4560000
            },
            {
                lastPrice: 9567.03,
                price: 9566.18,
                lastTrend: 0,
                trend: 1,
                time: 4620000
            },
            {
                lastPrice: 9566.18,
                price: 9566,
                lastTrend: 1,
                trend: 1,
                time: 4680000
            },
            {
                lastPrice: 9566,
                price: 9517.56,
                lastTrend: 1,
                trend: 1,
                time: 4740000
            },
            {
                lastPrice: 9517.56,
                price: 9510.01,
                lastTrend: 1,
                trend: 1,
                time: 4800000
            }
        ]
        const realDataHarvested2 = [
            {
                lastPrice: undefined,
                price: 9120.71,
                lastTrend: undefined,
                trend: null,
                time: 0
            },
            {
                lastPrice: 9120.71,
                price: 9169,
                lastTrend: null,
                trend: 0,
                time: 60000
            },
            {
                lastPrice: 9169,
                price: 9177,
                lastTrend: 0,
                trend: 0,
                time: 120000
            },
            {
                lastPrice: 9177,
                price: 9180.29,
                lastTrend: 0,
                trend: 0,
                time: 180000
            },
            {
                lastPrice: 9180.29,
                price: 9137.21,
                lastTrend: 0,
                trend: 1,
                time: 240000
            },
            {
                lastPrice: 9137.21,
                price: 9055.92,
                lastTrend: 1,
                trend: 1,
                time: 300000
            },
            {
                lastPrice: 9055.92,
                price: 9061.01,
                lastTrend: 1,
                trend: 0,
                time: 360000
            },
            {
                lastPrice: 9061.01,
                price: 9081.08,
                lastTrend: 0,
                trend: 0,
                time: 420000
            },
            {
                lastPrice: 9081.08,
                price: 9093,
                lastTrend: 0,
                trend: 0,
                time: 480000
            },
            {
                lastPrice: 9093,
                price: 9092.01,
                lastTrend: 0,
                trend: 1,
                time: 540000
            },
            {
                lastPrice: 9092.01,
                price: 9070.74,
                lastTrend: 1,
                trend: 1,
                time: 600000
            },
            {
                lastPrice: 9070.74,
                price: 9048.95,
                lastTrend: 1,
                trend: 1,
                time: 660000
            }]


        // console.log(this.chartAnalyzer.containsHollow(realDataHarvested))
        // console.log(this.chartWorker.filterNoise(realDataHarvested))
        // console.log(this.chartAnalyzer.containsBump(worksContainingBump))
    }

    async watchChartWorker() {
        this.workObserver = this.chartWorker.work$.subscribe((work: ChartWork) => {
            this.worksStored = this.chartWorker.copyWorks()
            this.analyzeWorks()
        })
    }

    analyzeWorks() {
        const lastPrice = this.chartWorker.lastPrice
        const thresholdDifferenceBetweenPrice = config.trader.thresholdDifferenceBetweenLastSellPrieAndNewBuyPrice

        console.log('\non Analyse le travail')

        if (TraderState.WAITING_TO_BUY === this.state) {
            console.log('Trader wants to buy...')

            /*
             * Trader is waiting to buy
             * we will try to know if we are in a hollow case
             */
            if (this.chartAnalyzer.containsHollow(this.worksStored)) {
                console.log('hollow detected!')
                /*
                 * We found a hollow, do we have already sold?
                 * If yes: we will buy only if the price is under the last sell price (we want a negative enough pct difference)
                 * If no: we can just buy at the current price
                 */
                if (!this.lastTrade || (Number.isFinite(this.lastTrade.price) && Equation.rateBetweenValues(this.lastTrade.price, lastPrice) < -thresholdDifferenceBetweenPrice)) {
                    console.log('we will buy!')
                    // We have sold, and the current price is below since the last price we sold so we can buy
                    this.buy(this.fiatCurrencyAmountAvailable)
                }

                // Hollow was not enough down in order to buy, but we clear works in order to avoid to loop through it later in analyzer
                this.clearWorks()
            } else {
                console.log('waiting for an hollow...')
            }
        } else if (TraderState.WAITING_TO_SELL === this.state) {
            console.log('Trader wants to sell...')
            /*
             * Trader is waiting to sell
             * we will try to know if we are in a bump case
             */
            if (this.chartAnalyzer.containsBump(this.worksStored)) {
                console.log('Bump detected!')
                /*
                 * We found a bump, do we have already bought?
                 * If yes: we will buy only if the price is under the last sell price
                 * If no: we do nothing, we wait an hollow to buy first
                 */
                if (this.lastTrade && Number.isFinite(this.lastTrade.price) && this.isProfitable(this.lastTrade.price, this.chartWorker.lastPrice)) {
                    console.log('we will sell!')
                    this.sell(this.currencyAmountAvailable)
                }

                // Bump was not enough up in order to sell, but we clear works in order to avoid to loop through it later in analyzer
                this.clearWorks()
            } else {
                console.log('waiting for a bump...')
            }
        } else {
            console.error(`Trader.state does not match any action: ${this.state}`)
            this.stop() // No action to be done, trader is maybe crashed, need external intervention
        }
    }

    isProfitable(priceA, priceB) {
        const multiplierFeesIncluded = 1 - config.market.instantOrderFees

        // a = 0.9975^2 * a * (p2/p1)
        // b > a <=> p2 > p1 / 0.9975^2
        return priceB > (priceA / (Math.pow(multiplierFeesIncluded, 2)))
    }

    clearWorks() {
        this.worksStored = []
    }

    async buy(funds: number) {
        try {
            if (!Number.isFinite(funds)) {
                throw new Error(`Cannot buy, funds are invalid: ${funds}`)
            }

            const lastWork = this.chartWorker.lastWork

            this.state = TraderState.WAITING_TO_SELL
            this.lastTrade = {
                price: this.chartWorker.lastPrice,
                time: lastWork.time,
                benefits: -funds,
                type: TradeType.BUY,
                quantity: funds / lastWork.price
            }

            this.trades.push(this.lastTrade)

            console.log(`Bought! Last trade: ${this.lastTrade}`)

            // await this
            //     .market
            //     .orders
            //     .buyMarket(this.market.currency, funds)

            // // TODO: check order book ou nos open orders pour savoir quand l'ordre est fini
            // // récupérer nos comptes pour savoir combien on a en crypto currency et en fiat currency (les amount)
            // this.fiatCurrencyAmountAvailable = this.fiatCurrencyAmountAvailable - funds
            // this.currencyAmountAvailable = this.currencyAmountAvailable + (funds / this.chartWorker.lastPrice)
        } catch (error) {
            console.error(`Error when trying to buy: ${error}`)
        }
    }

    async sell(funds: number) {
        try {
            if (!Number.isFinite(funds)) {
                throw new Error(`Cannot sell, funds are invalid: ${funds}`)
            }

            if (this.lastTrade.type !== TradeType.BUY) {
                throw new Error('Trying to sell but last trade is not of type BUY.')
            }

            const lastWork = this.chartWorker.lastWork

            this.state = TraderState.WAITING_TO_BUY
            this.lastTrade = {
                price: this.chartWorker.lastPrice,
                time: lastWork.time,
                benefits: (this.chartWorker.lastPrice * funds) - (this.lastTrade.quantity * this.lastTrade.price),
                type: TradeType.SELL,
                quantity: funds
            }

            this.trades.push(this.lastTrade)

            console.log(`Sold! Last trade: ${this.lastTrade}`)

            // await this
            //     .market
            //     .orders
            //     .sellMarket(this.market.currency, funds)

            // // TODO: check order book ou nos open orders pour savoir quand l'ordre est fini
            // // récupérer nos comptes pour savoir combien on a en crypto currency et en fiat currency (les amount)
            // this.fiatCurrencyAmountAvailable = this.fiatCurrencyAmountAvailable + (funds * this.chartWorker.lastPrice)
            // this.currencyAmountAvailable = this.currencyAmountAvailable - funds
        } catch (error) {
            console.error(`Error when trying to sell: ${error}`)
        }
    }

    async cancel(order: Order) {
        try {
            await this
                .market
                .orders
                .cancel(order)
        } catch (error) {
            console.error(`Error when trying to cancel order: ${error}`)
        }
    }

    stop() {
        console.warn('Trader has been stopped.')
        this.killWatchers()
    }

    killWatchers() {
        if (this.priceObserver) {
            this.priceObserver.unsubscribe()
        }

        if (this.workObserver) {
            this.workObserver.unsubscribe()
        }
    }

    logDebug() {
        console.log('Trader work retrieved:')
        console.log(this.chartWorker.works)
        console.log(this.trades)
    }

    getDebug() {
        return {
            allWorksStored: this.chartWorker.works,
            allWorksSmoothed: this.chartWorker.filterNoise(this.chartWorker.works),
            trades: this.trades
        }
    }
}

export default Trader