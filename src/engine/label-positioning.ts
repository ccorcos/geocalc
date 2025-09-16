import { distance } from "../math"
import { Geometry, Label, Point } from "./types"

export interface Position {
	x: number
	y: number
}

/**
 * Calculate the position for a coordinate label
 */
export function calculateCoordinatePosition(
	point: Point,
	offset: { x: number; y: number },
	scale: number
): Position {
	const scaleUnit = scale / 20
	const defaultOffset = { x: scaleUnit, y: -scaleUnit } // Upper-right of point
	return {
		x: point.x + (offset.x || defaultOffset.x),
		y: point.y + (offset.y || defaultOffset.y),
	}
}

/**
 * Calculate the position for a distance label with dimension line
 */
export function calculateDistancePosition(
	p1: Point,
	p2: Point,
	offset: { x: number; y: number },
	scale: number
): Position {
	const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
	const scaleUnit = scale / 20

	// Calculate perpendicular offset for dimension line
	const dx = p2.x - p1.x
	const dy = p2.y - p1.y
	const length = Math.sqrt(dx * dx + dy * dy)

	if (length === 0) {
		// Fallback for coincident points
		return {
			x: midpoint.x + (offset.x || 0),
			y: midpoint.y + (offset.y || -scaleUnit),
		}
	}

	const perpX = (-dy / length) * scaleUnit // scale/20 units default perpendicular distance
	const perpY = (dx / length) * scaleUnit

	return {
		x: midpoint.x + perpX + (offset.x || 0),
		y: midpoint.y + perpY + (offset.y || 0),
	}
}

/**
 * Calculate the position for an angle label along the angle bisector
 */
export function calculateAnglePosition(
	p1: Point,
	vertex: Point,
	p2: Point,
	offset: { x: number; y: number },
	scale: number
): Position {
	const scaleUnit = scale / 20
	
	// Calculate vectors from vertex to each point
	const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y }
	const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y }

	// Normalize vectors
	const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
	const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

	if (len1 === 0 || len2 === 0) {
		// Fallback for coincident points
		return {
			x: vertex.x + scaleUnit * 1.5 + (offset.x || 0),
			y: vertex.y - scaleUnit * 0.75 + (offset.y || 0),
		}
	}

	v1.x /= len1
	v1.y /= len1
	v2.x /= len2
	v2.y /= len2

	// Calculate directed angle from p1 to p2 to position label correctly
	const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
	const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)
	
	// Calculate directed angle difference
	let angleDiff = angle2 - angle1
	if (angleDiff < 0) angleDiff += 2 * Math.PI
	
	// Calculate the midpoint angle of the directed arc
	let midAngle = angle1 + angleDiff / 2
	
	// Position along the angle bisector
	const distance = scaleUnit * 1.5
	return {
		x: vertex.x + Math.cos(midAngle) * distance + (offset.x || 0),
		y: vertex.y + Math.sin(midAngle) * distance + (offset.y || 0),
	}
}

/**
 * Calculate label position based on label type and referenced entities
 */
export function calculateLabelPosition(
	label: Label,
	geometry: Geometry
): Position | null {
	switch (label.type) {
		case "coordinate": {
			const [pointId] = label.entityIds
			const point = geometry.points.get(pointId)
			if (!point) return null
			return calculateCoordinatePosition(point, label.offset, geometry.scale)
		}

		case "distance": {
			const [point1Id, point2Id] = label.entityIds
			const p1 = geometry.points.get(point1Id)
			const p2 = geometry.points.get(point2Id)
			if (!p1 || !p2) return null
			return calculateDistancePosition(p1, p2, label.offset, geometry.scale)
		}

		case "angle": {
			const [point1Id, vertexId, point2Id] = label.entityIds
			const p1 = geometry.points.get(point1Id)
			const vertex = geometry.points.get(vertexId)
			const p2 = geometry.points.get(point2Id)
			if (!p1 || !vertex || !p2) return null
			return calculateAnglePosition(p1, vertex, p2, label.offset, geometry.scale)
		}

		default:
			return null
	}
}

/**
 * Calculate label text content based on label type and referenced entities
 */
export function calculateLabelText(label: Label, geometry: Geometry): string {
	switch (label.type) {
		case "coordinate": {
			const [pointId] = label.entityIds
			const point = geometry.points.get(pointId)
			if (!point) return ""
			return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`
		}

		case "distance": {
			const [point1Id, point2Id] = label.entityIds
			const p1 = geometry.points.get(point1Id)
			const p2 = geometry.points.get(point2Id)
			if (!p1 || !p2) return ""
			const dist = distance(p1, p2)
			return dist.toFixed(2)
		}

		case "angle": {
			const [point1Id, vertexId, point2Id] = label.entityIds
			const p1 = geometry.points.get(point1Id)
			const vertex = geometry.points.get(vertexId)
			const p2 = geometry.points.get(point2Id)
			if (!p1 || !vertex || !p2) return ""

			// Calculate directed angle from p1 to p2 around vertex
			const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
			const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)

			// Calculate directed angle difference (can be > 180°)
			let angleDiff = angle2 - angle1
			if (angleDiff < 0) angleDiff += 2 * Math.PI
			
			const angleDegrees = (angleDiff * 180) / Math.PI

			return `${angleDegrees.toFixed(1)}°`
		}

		default:
			return ""
	}
}

/**
 * Calculate dimension line endpoints for distance labels
 */
export function calculateDimensionLineEndpoints(
	p1: Point,
	p2: Point,
	labelPosition: Position
): {
	start: Position
	end: Position
	extensionLines: {
		p1Start: Position
		p1End: Position
		p2Start: Position
		p2End: Position
	}
} {
	// Vector from p1 to p2
	const lineVec = { x: p2.x - p1.x, y: p2.y - p1.y }
	const lineLength = Math.sqrt(lineVec.x * lineVec.x + lineVec.y * lineVec.y)

	if (lineLength === 0) {
		// Fallback for coincident points
		return {
			start: p1,
			end: p2,
			extensionLines: {
				p1Start: p1,
				p1End: p1,
				p2Start: p2,
				p2End: p2,
			},
		}
	}

	// Unit vector along line
	const lineUnit = { x: lineVec.x / lineLength, y: lineVec.y / lineLength }

	// Perpendicular unit vector
	const perpUnit = { x: -lineUnit.y, y: lineUnit.x }

	// Calculate how far the label is from the original line
	const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
	const labelOffset = {
		x: labelPosition.x - midpoint.x,
		y: labelPosition.y - midpoint.y,
	}

	// Project label offset onto perpendicular direction
	const perpDistance = labelOffset.x * perpUnit.x + labelOffset.y * perpUnit.y

	// Dimension line endpoints (parallel to original line, offset by perpDistance)
	const dimensionStart = {
		x: p1.x + perpUnit.x * perpDistance,
		y: p1.y + perpUnit.y * perpDistance,
	}
	const dimensionEnd = {
		x: p2.x + perpUnit.x * perpDistance,
		y: p2.y + perpUnit.y * perpDistance,
	}

	// Extension lines (from original points to dimension line)
	const extensionLength = 2 // Small extension beyond points
	const extensionLines = {
		p1Start: p1,
		p1End: {
			x:
				dimensionStart.x +
				perpUnit.x * Math.sign(perpDistance) * extensionLength,
			y:
				dimensionStart.y +
				perpUnit.y * Math.sign(perpDistance) * extensionLength,
		},
		p2Start: p2,
		p2End: {
			x:
				dimensionEnd.x + perpUnit.x * Math.sign(perpDistance) * extensionLength,
			y:
				dimensionEnd.y + perpUnit.y * Math.sign(perpDistance) * extensionLength,
		},
	}

	return {
		start: dimensionStart,
		end: dimensionEnd,
		extensionLines,
	}
}

/**
 * Calculate arc path for angle labels
 */
export function calculateAngleArc(
	p1: Point,
	vertex: Point,
	p2: Point,
	scale: number,
	radius?: number
): {
	centerX: number
	centerY: number
	radius: number
	startAngle: number
	endAngle: number
} {
	// Use scale/20 units as default radius if not specified
	const defaultRadius = scale / 20
	const arcRadius = radius !== undefined ? radius : defaultRadius
	// Calculate angles of both rays from vertex
	const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
	const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)

	// Use directed angle from p1 to p2 (respects selection order)
	let startAngle = angle1
	let endAngle = angle2

	// Normalize angles to [0, 2π)
	if (startAngle < 0) startAngle += 2 * Math.PI
	if (endAngle < 0) endAngle += 2 * Math.PI

	// Draw arc from p1 to p2 in the shorter direction (respects selection order)
	const diff = endAngle - startAngle
	if (diff < 0) {
		endAngle += 2 * Math.PI
	} else if (diff > 2 * Math.PI) {
		startAngle += 2 * Math.PI
	}

	return {
		centerX: vertex.x,
		centerY: vertex.y,
		radius: arcRadius,
		startAngle: angle1,
		endAngle: angle2,
	}
}
