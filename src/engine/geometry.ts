import { generateId } from "../ids"
import { distance } from "../math"
import { Circle, Constraint, Geometry, Line, Point } from "./types"

export const createEmptyGeometry = (): Geometry => ({
	points: new Map(),
	lines: new Map(),
	circles: new Map(),
	constraints: new Map(),
	metadata: {
		version: "1.0.0",
		created: new Date(),
		modified: new Date(),
	},
})

export const createPoint = (x: number, y: number): Point => ({
	id: generateId(),
	x,
	y,
})

export const createLine = (
	point1Id: string,
	point2Id: string,
	infinite = false
): Line => ({
	id: generateId(),
	point1Id,
	point2Id,
	infinite,
})

export const createCircle = (geometry: Geometry, centerId: string, initialRadius: number): { circle: Circle; radiusPoint: Point; updatedGeometry: Geometry } => {
	const center = geometry.points.get(centerId)
	if (!center) {
		throw new Error(`Center point not found: ${centerId}`)
	}
	
	// Create radius point at (center.x + radius, center.y)
	const radiusPoint = createPoint(center.x + initialRadius, center.y)
	
	// Add radius point to geometry
	const updatedGeometry = addPoint(geometry, radiusPoint)
	
	const circle: Circle = {
		id: generateId(),
		centerId,
		radiusPointId: radiusPoint.id
	}
	
	return { circle, radiusPoint, updatedGeometry }
}

export const getCircleRadius = (circle: Circle, geometry: Geometry): number => {
	const center = geometry.points.get(circle.centerId)
	const radiusPoint = geometry.points.get(circle.radiusPointId)
	if (!center || !radiusPoint) return 0
	return distance(center, radiusPoint)
}

export const createConstraint = (
	type: Constraint["type"],
	entityIds: string[],
	value?: number,
	priority = 1
): Constraint => ({
	id: generateId(),
	type,
	entityIds,
	value,
	priority,
})

export const addPoint = (geometry: Geometry, point: Point): Geometry => {
	const newPoints = new Map(geometry.points)
	newPoints.set(point.id, point)

	return {
		...geometry,
		points: newPoints,
		metadata: {
			...geometry.metadata,
			modified: new Date(),
		},
	}
}

export const addLine = (geometry: Geometry, line: Line): Geometry => {
	const newLines = new Map(geometry.lines)
	newLines.set(line.id, line)

	return {
		...geometry,
		lines: newLines,
		metadata: {
			...geometry.metadata,
			modified: new Date(),
		},
	}
}

export const addCircle = (geometry: Geometry, circle: Circle): Geometry => {
	const newCircles = new Map(geometry.circles)
	newCircles.set(circle.id, circle)

	return {
		...geometry,
		circles: newCircles,
		metadata: {
			...geometry.metadata,
			modified: new Date(),
		},
	}
}

export const addConstraint = (
	geometry: Geometry,
	constraint: Constraint
): Geometry => {
	const newConstraints = new Map(geometry.constraints)
	newConstraints.set(constraint.id, constraint)

	return {
		...geometry,
		constraints: newConstraints,
		metadata: {
			...geometry.metadata,
			modified: new Date(),
		},
	}
}
