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
}

export default Equation