import { beforeEach, describe, expect, it } from "vitest"

import {
	addCircle,
	addConstraint,
	addLine,
	addPoint,
	createCircle,
	createConstraint,
	createEmptyGeometry,
	createLine,
	createPoint,
} from "./geometry"
import { Geometry } from "./types"

describe("Geometry Operations", () => {
	let geometry: Geometry

	beforeEach(() => {
		geometry = createEmptyGeometry()
	})

	describe("createEmptyGeometry", () => {
		it("should create empty geometry with proper structure", () => {
			expect(geometry.points).toBeInstanceOf(Map)
			expect(geometry.lines).toBeInstanceOf(Map)
			expect(geometry.circles).toBeInstanceOf(Map)
			expect(geometry.constraints).toBeInstanceOf(Map)

			expect(geometry.points.size).toBe(0)
			expect(geometry.lines.size).toBe(0)
			expect(geometry.circles.size).toBe(0)
			expect(geometry.constraints.size).toBe(0)

			expect(geometry.metadata.version).toBe("1.0.0")
			expect(geometry.metadata.created).toBeInstanceOf(Date)
			expect(geometry.metadata.modified).toBeInstanceOf(Date)
		})
	})

	describe("createPoint", () => {
		it("should create point with unique ID and specified coordinates", () => {
			const point = createPoint(10, 20)

			expect(point.id).toBeDefined()
			expect(point.x).toBe(10)
			expect(point.y).toBe(20)
		})

		it("should generate unique IDs for different points", () => {
			const point1 = createPoint(0, 0)
			const point2 = createPoint(1, 1)

			expect(point1.id).not.toBe(point2.id)
		})
	})

	describe("createLine", () => {
		it("should create line with specified point references", () => {
			const line = createLine("point1", "point2")

			expect(line.id).toBeDefined()
			expect(line.point1Id).toBe("point1")
			expect(line.point2Id).toBe("point2")
			expect(line.infinite).toBe(false)
		})

		it("should create infinite line when specified", () => {
			const line = createLine("p1", "p2", true)

			expect(line.infinite).toBe(true)
		})
	})

	describe("createCircle", () => {
		it("should create circle with center and radius", () => {
			const geometry = createEmptyGeometry()
			const center = createPoint(0, 0)
			geometry.points.set(center.id, center)
			
			const result = createCircle(geometry, center.id, 42)

			expect(result.circle.id).toBeDefined()
			expect(result.circle.centerId).toBe(center.id)
			expect(result.circle.radiusPointId).toBeDefined()
			expect(result.radiusPoint.x).toBe(42) // radius point at (42, 0)
			expect(result.radiusPoint.y).toBe(0)
		})
	})

	describe("createConstraint", () => {
		it("should create constraint with specified properties", () => {
			const constraint = createConstraint("distance", ["p1", "p2"], 100, 2)

			expect(constraint.id).toBeDefined()
			expect(constraint.type).toBe("distance")
			expect(constraint.entityIds).toEqual(["p1", "p2"])
			expect(constraint.value).toBe(100)
			expect(constraint.priority).toBe(2)
		})

		it("should use default priority when not specified", () => {
			const constraint = createConstraint("parallel", ["l1", "l2"])

			expect(constraint.priority).toBe(1)
			expect(constraint.value).toBeUndefined()
		})
	})

	describe("addPoint", () => {
		it("should add point to geometry and update metadata", () => {
			const point = createPoint(5, 10)
			const originalModified = geometry.metadata.modified

			// Wait a tiny bit to ensure different timestamps
			setTimeout(() => {
				const updatedDoc = addPoint(geometry, point)

				expect(updatedDoc.points.has(point.id)).toBe(true)
				expect(updatedDoc.points.get(point.id)).toBe(point)
				expect(updatedDoc.metadata.modified.getTime()).toBeGreaterThan(
					originalModified.getTime()
				)
			}, 1)
		})

		it("should not mutate original geometry", () => {
			const point = createPoint(1, 2)
			const originalSize = geometry.points.size

			const updatedDoc = addPoint(geometry, point)

			expect(geometry.points.size).toBe(originalSize)
			expect(updatedDoc.points.size).toBe(originalSize + 1)
			expect(updatedDoc).not.toBe(geometry)
		})
	})

	describe("addLine", () => {
		it("should add line to geometry", () => {
			const line = createLine("p1", "p2")
			const updatedDoc = addLine(geometry, line)

			expect(updatedDoc.lines.has(line.id)).toBe(true)
			expect(updatedDoc.lines.get(line.id)).toBe(line)
		})
	})

	describe("addCircle", () => {
		it("should add circle to geometry", () => {
			const center = createPoint(0, 0)
			geometry.points.set(center.id, center)
			
			const result = createCircle(geometry, center.id, 50)
			const updatedDoc = addCircle(result.updatedGeometry, result.circle)

			expect(updatedDoc.circles.has(result.circle.id)).toBe(true)
			expect(updatedDoc.circles.get(result.circle.id)).toBe(result.circle)
		})
	})

	describe("addConstraint", () => {
		it("should add constraint to geometry", () => {
			const constraint = createConstraint("distance", ["p1", "p2"], 10)
			const updatedDoc = addConstraint(geometry, constraint)

			expect(updatedDoc.constraints.has(constraint.id)).toBe(true)
			expect(updatedDoc.constraints.get(constraint.id)).toBe(constraint)
		})
	})

	describe("Geometry Integration", () => {
		it("should handle complex geometry with multiple entities", () => {
			const p1 = createPoint(0, 0)
			const p2 = createPoint(10, 10)
			const line = createLine(p1.id, p2.id)
			
			let tempGeometry = createEmptyGeometry()
			tempGeometry.points.set(p1.id, p1)
			const circleResult = createCircle(tempGeometry, p1.id, 5)
			const circle = circleResult.circle
			
			const constraint = createConstraint("distance", [p1.id, p2.id], 14.142)

			let doc = addPoint(geometry, p1)
			doc = addPoint(doc, p2)
			doc = addPoint(doc, circleResult.radiusPoint) // Add radius point
			doc = addLine(doc, line)
			doc = addCircle(doc, circle)
			doc = addConstraint(doc, constraint)

			expect(doc.points.size).toBe(3) // p1, p2, and radius point
			expect(doc.lines.size).toBe(1)
			expect(doc.circles.size).toBe(1)
			expect(doc.constraints.size).toBe(1)

			// Verify references are maintained
			const storedLine = doc.lines.get(line.id)!
			expect(storedLine.point1Id).toBe(p1.id)
			expect(storedLine.point2Id).toBe(p2.id)

			const storedCircle = doc.circles.get(circle.id)!
			expect(storedCircle.centerId).toBe(p1.id)

			const storedConstraint = doc.constraints.get(constraint.id)!
			expect(storedConstraint.entityIds).toContain(p1.id)
			expect(storedConstraint.entityIds).toContain(p2.id)
		})
	})
})
