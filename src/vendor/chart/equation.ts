import Point from './point';
import config from '../../config';

class Equation {
    static findLineLeadingCoefficient(pointA: Point, pointB: Point): number {
        if (!Equation.isValidPoint(pointA) || !Equation.isValidPoint(pointB)) {
            return null
        }

        return Equation.findLineEquation(pointA, pointB).a
    }

    static findLineEquation(pointA: Point, pointB: Point) {
        const a = (pointB.y - pointA.y) / (pointB.x - pointA.x)
        const b = pointA.y - (a * pointA.x)

        return {
            a,
            b
        }
    }

    static isValidPoint(point: Point) {
        return point && Number.isFinite(point.x) && Number.isFinite(point.y)
    }

    static rateBetweenValues(a, b): number {
        return 100 * ((b / a) - 1) // from: a * (1 + t/100) = b <=> t = 100(b/a - 1)
    }

    static isProfitable(buyPrice, comparedPrice) {
        const threshold = Equation.thresholdPriceOfProbitability(buyPrice)

        return comparedPrice > threshold * (1 + (config.trader.minProfitableRateWhenSelling / 100))
    }

    static thresholdPriceOfProbitability(buyPrice) {
        const multiplierFeesIncluded = 1 - config.market.instantOrderFees

        if (multiplierFeesIncluded === 0) {
            throw new Error(`Mathematic error when trying to calculate threshold price of profitability (multiplierFeesIncluded = 0, cannot divide by zero)`)
        }

        // a = amount invested, p1 = price when bought (with "a" amount), b = amount recovered, p2 = price when sold (give "b" amount)
        // b = 0.9975^2 * a * (p2/p1)
        // b > a <=> p2 > p1 / 0.9975^2
        return buyPrice / Math.pow(multiplierFeesIncluded, 2)
    }
}

export default Equation