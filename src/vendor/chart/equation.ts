import Point from './point'

class Equation {
    static findLineLeadingCoefficient(pointA: Point, pointB: Point): number {
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
}

export default Equation