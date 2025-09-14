import { describe, it, expect } from "vitest"
import { migrateStorageFormat } from "./migrations"
import v1Data from "./v1.json"

describe("Real-world migration test with v1.json", () => {
	it("should successfully migrate actual v1.json data", () => {
		// Test with the actual v1.json file
		const migrated = migrateStorageFormat(v1Data)

		// Verify version upgrade
		expect(migrated.version).toBe(4)
		
		// Verify counter initialization
		expect(migrated.nextId).toBeDefined()
		expect(migrated.nextId).toBeGreaterThan(24) // Should be 25 for the 24 entities in v1.json
		
		// Verify all entities were migrated
		expect(migrated.geometry.points).toHaveLength(5)
		expect(migrated.geometry.lines).toHaveLength(3) 
		expect(migrated.geometry.circles).toHaveLength(2)
		expect(migrated.geometry.labels).toHaveLength(4)
		expect(migrated.geometry.constraints).toHaveLength(10)
		
		// Verify entity properties preserved
		const firstPoint = migrated.geometry.points[0][1]
		expect(firstPoint.x).toBeCloseTo(0.00027597007463034666, 10)
		expect(firstPoint.y).toBeCloseTo(-0.0005067315285428527, 10)
		
		// Verify line relationships preserved 
		const firstLine = migrated.geometry.lines[0][1]
		expect(firstLine.point1Id).toBeDefined()
		expect(firstLine.point2Id).toBeDefined()
		
		// Find the points that this line should connect
		const point1 = migrated.geometry.points.find(([pointId]) => pointId === firstLine.point1Id)
		const point2 = migrated.geometry.points.find(([pointId]) => pointId === firstLine.point2Id)
		expect(point1).toBeDefined()
		expect(point2).toBeDefined()
		
		// Verify circle relationships preserved
		const firstCircle = migrated.geometry.circles[0][1]
		expect(firstCircle.centerId).toBeDefined()
		expect(firstCircle.radiusPointId).toBeDefined()
		
		// Find the center and radius points
		const centerPoint = migrated.geometry.points.find(([pointId]) => pointId === firstCircle.centerId)
		const radiusPoint = migrated.geometry.points.find(([pointId]) => pointId === firstCircle.radiusPointId)
		expect(centerPoint).toBeDefined()
		expect(radiusPoint).toBeDefined()
		
		// Verify constraint relationships preserved
		const distanceConstraint = migrated.geometry.constraints.find(([_, constraint]) => constraint.type === "distance")
		expect(distanceConstraint).toBeDefined()
		expect(distanceConstraint![1].entityIds).toHaveLength(2)
		
		// Verify entity IDs referenced in constraints exist
		const allEntityIds = [
			...migrated.geometry.points.map(([id]) => id),
			...migrated.geometry.lines.map(([id]) => id),
			...migrated.geometry.circles.map(([id]) => id),
			...migrated.geometry.labels.map(([id]) => id),
		]
		
		migrated.geometry.constraints.forEach(([_, constraint]) => {
			constraint.entityIds.forEach(entityId => {
				expect(allEntityIds).toContain(entityId)
			})
		})
		
		// Verify special constraint ID patterns were updated correctly
		const xConstraint = migrated.geometry.constraints.find(([_id, constraint]) => constraint.type === "x")
		const yConstraint = migrated.geometry.constraints.find(([_id, constraint]) => constraint.type === "y")
		expect(xConstraint![0]).toMatch(/^x-\d+$/)
		expect(yConstraint![0]).toMatch(/^y-\d+$/)
		
		const lengthConstraints = migrated.geometry.constraints.filter(([constraintId, _constraint]) => constraintId.startsWith("line-length-"))
		expect(lengthConstraints.length).toBeGreaterThan(0)
		lengthConstraints.forEach(([id]) => {
			expect(id).toMatch(/^line-length-\d+$/)
		})
		
		// Verify all IDs are now counter-based (no UUIDs remain)
		const allIds = [
			...migrated.geometry.points.map(([id]) => id),
			...migrated.geometry.lines.map(([id]) => id),
			...migrated.geometry.circles.map(([id]) => id),
			...migrated.geometry.labels.map(([id]) => id),
			...migrated.geometry.constraints.map(([id]) => id),
		]
		
		allIds.forEach(id => {
			// Check this is not a UUID (36 chars with 4 dashes)
			const isUUID = id.length === 36 && id.split('-').length === 5
			expect(isUUID).toBe(false)
		})
		
		console.log("Migration successful! Sample migrated data:")
		console.log("- First point ID:", migrated.geometry.points[0][0])
		console.log("- First line ID:", migrated.geometry.lines[0][0]) 
		console.log("- First constraint ID:", migrated.geometry.constraints[0][0])
		console.log("- Next available ID:", migrated.nextId)
	})
})