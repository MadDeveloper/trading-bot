import Point from './point';

class Chart {
    points: Point[]

    constructor(points: Point[] = []) {
        this.points = points
    }

    containsHollow(cursorPointIndex: number, range: number = 5): boolean {
        const startPointIndex = cursorPointIndex - range >= 0 ? cursorPointIndex - range : 0
        const endPointIndex = cursorPointIndex + range < this.points.length ? cursorPointIndex + range : this.points.length - 1
        const startPoint = this.points[startPointIndex]
        const endPoint = this.points[endPointIndex]
        
        cursorPointIndex = cursorPointIndex >= 0 && cursorPointIndex < this.points.length ? cursorPointIndex : endPointIndex - startPointIndex

        const middlePoint = this.points[cursorPointIndex]

        return false
    }

    containsBump(points: Point[] = null): boolean {
        return false
    }

    isDownwardTrend(points: Point[] = null): boolean {
        return false
    }

    isUpwardTrend(points: Point[] = null): boolean {
        return false
    }

    isFlatTrend(points: Point[] = null): boolean {
        return false
    }

    createPoint(x: number, y: number) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            console.error(`Cannot create point on the chart, coordinates are invalid (x: ${x}, y: ${y})`)
        }

        this.points.push(new Point(x, y))
    }

    clearPoints() {
        this.points = []
    }
}

export default Chart