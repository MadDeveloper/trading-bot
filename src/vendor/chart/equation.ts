import Point from './point';

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
}

export default Equation