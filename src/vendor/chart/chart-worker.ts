import Market from '../interfaces/market'
import config from '../../config';
import Chart from './chart';
import Equation from './equation';
import Point from './point';

class ChartWorker {
    chart: Chart
    market: Market
    tickerInterval: any

    constructor(market: Market) {
        this.market = market
        this.chart = new Chart()
    }

    workOnPriceTicker() {
        let time = 0

        this.tickerInterval = setInterval(async () => {
            const price = await this.market.getCurrencyPrice()
            const point = this.chart.createPoint(time, price)
    
            console.log(price, new Point(time / 1000, price))

            time += config.trader.tickerInterval
        }, config.trader.tickerInterval)
    }

    stopWorking() {
        if (this.tickerInterval) {
            clearInterval(this.tickerInterval)
        }
    }
}

export default ChartWorker