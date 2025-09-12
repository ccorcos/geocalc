import type { Point, Line, Circle, Label, Constraint } from "../engine/types"

export function remapEntityIds<T extends { id: string }>(
	entities: [string, T][],
	idMap: Map<string, string>
): [string, T][] {
	return entities.map(([oldId, entity]) => {
		const newId = idMap.get(oldId)
		if (!newId) {
			throw new Error(`No mapping found for entity ID: ${oldId}`)
		}
		return [newId, { ...entity, id: newId }]
	})
}

export function remapLineIds(
	lines: [string, Line][],
	idMap: Map<string, string>
): [string, Line][] {
	return lines.map(([oldId, line]) => {
		const newId = idMap.get(oldId)
		const newPoint1Id = idMap.get(line.point1Id)
		const newPoint2Id = idMap.get(line.point2Id)
		
		if (!newId || !newPoint1Id || !newPoint2Id) {
			throw new Error(`Missing ID mapping for line ${oldId} or its points`)
		}
		
		return [newId, {
			...line,
			id: newId,
			point1Id: newPoint1Id,
			point2Id: newPoint2Id,
		}]
	})
}

export function remapCircleIds(
	circles: [string, Circle][],
	idMap: Map<string, string>
): [string, Circle][] {
	return circles.map(([oldId, circle]) => {
		const newId = idMap.get(oldId)
		const newCenterId = idMap.get(circle.centerId)
		const newRadiusPointId = idMap.get(circle.radiusPointId)
		
		if (!newId || !newCenterId || !newRadiusPointId) {
			throw new Error(`Missing ID mapping for circle ${oldId} or its points`)
		}
		
		return [newId, {
			...circle,
			id: newId,
			centerId: newCenterId,
			radiusPointId: newRadiusPointId,
		}]
	})
}

export function remapLabelIds(
	labels: [string, Label][],
	idMap: Map<string, string>
): [string, Label][] {
	return labels.map(([oldId, label]) => {
		const newId = idMap.get(oldId)
		if (!newId) {
			throw new Error(`No mapping found for label ID: ${oldId}`)
		}
		
		// Remap entity IDs that labels reference
		const newEntityIds = label.entityIds.map(entityId => {
			const newEntityId = idMap.get(entityId)
			if (!newEntityId) {
				throw new Error(`No mapping found for label entity ID: ${entityId}`)
			}
			return newEntityId
		})
		
		return [newId, {
			...label,
			id: newId,
			entityIds: newEntityIds,
		}]
	})
}

export function remapConstraintIds(
	constraints: [string, Constraint][],
	idMap: Map<string, string>
): [string, Constraint][] {
	return constraints.map(([oldId, constraint]) => {
		// Handle special constraint ID patterns
		let newId = remapSpecialConstraintId(oldId, idMap)
		
		// If not a special pattern, use regular ID mapping
		if (newId === oldId) {
			const mappedId = idMap.get(oldId)
			if (!mappedId) {
				throw new Error(`No mapping found for constraint ID: ${oldId}`)
			}
			newId = mappedId
		}
		
		// Remap entity IDs that constraints reference
		const newEntityIds = constraint.entityIds.map(entityId => {
			const newEntityId = idMap.get(entityId)
			if (!newEntityId) {
				throw new Error(`No mapping found for constraint entity ID: ${entityId}`)
			}
			return newEntityId
		})
		
		return [newId, {
			...constraint,
			id: newId,
			entityIds: newEntityIds,
		}]
	})
}

function remapSpecialConstraintId(constraintId: string, idMap: Map<string, string>): string {
	// Handle x-{pointId} pattern
	if (constraintId.startsWith("x-")) {
		const pointId = constraintId.substring(2)
		const newPointId = idMap.get(pointId)
		if (newPointId) {
			return `x-${newPointId}`
		}
	}
	
	// Handle y-{pointId} pattern
	if (constraintId.startsWith("y-")) {
		const pointId = constraintId.substring(2)
		const newPointId = idMap.get(pointId)
		if (newPointId) {
			return `y-${newPointId}`
		}
	}
	
	// Handle line-length-{lineId} pattern
	if (constraintId.startsWith("line-length-")) {
		const lineId = constraintId.substring(12)
		const newLineId = idMap.get(lineId)
		if (newLineId) {
			return `line-length-${newLineId}`
		}
	}
	
	// Handle circle-radius-{circleId} pattern (if it exists)
	if (constraintId.startsWith("circle-radius-")) {
		const circleId = constraintId.substring(14)
		const newCircleId = idMap.get(circleId)
		if (newCircleId) {
			return `circle-radius-${newCircleId}`
		}
	}
	
	// Return original ID if no pattern matched
	return constraintId
}

export function getAllEntityIds(geometry: {
	points: [string, Point][]
	lines: [string, Line][]
	circles: [string, Circle][]
	labels: [string, Label][]
	constraints: [string, Constraint][]
}): string[] {
	return [
		...geometry.points.map(([id]) => id),
		...geometry.lines.map(([id]) => id),
		...geometry.circles.map(([id]) => id),
		...geometry.labels.map(([id]) => id),
		...geometry.constraints.map(([id]) => id),
	]
}