import Point from './point';
import Logger from '../logger/index';

class Chart {
    points: Point[]

    constructor(points: Point[] = []) {
        this.points = points
    }

    createPoint(x: number, y: number): Point {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            Logger.error(`Cannot create point on the chart, coordinates are invalid (x: ${x}, y: ${y})`)
        }

        const point = new Point(x, y)

        this.points.push(point)

        return Object.assign({}, point)
    }

    addPoint(point: Point) {
        this.points.push(point)
    }

    lastPoint(): Point {
        if (this.points.length === 0) {
            return null
        }

        return Object.assign({}, this.points[this.points.length - 1])
    }

    clearPoints() {
        this.points = []
    }
}

export default Chart