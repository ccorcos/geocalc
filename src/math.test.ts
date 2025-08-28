import { describe, expect, it } from "vitest"

import { Point } from "./engine/types"
import {
	clamp,
	distance,
	distancePointToLine,
	vectorDot,
	vectorFromPoints,
	vectorNormalize,
} from "./math"

describe("Mathematical Utilities", () => {
	describe("distance", () => {
		it("should calculate distance between two points correctly", () => {
			const p1: Point = { id: "1", x: 0, y: 0 }
			const p2: Point = { id: "2", x: 3, y: 4 }

			expect(distance(p1, p2)).toBe(5) // 3-4-5 triangle
		})

		it("should return 0 for same point", () => {
			const p: Point = { id: "1", x: 5, y: 10 }

			expect(distance(p, p)).toBe(0)
		})

		it("should handle negative coordinates", () => {
			const p1: Point = { id: "1", x: -3, y: -4 }
			const p2: Point = { id: "2", x: 0, y: 0 }

			expect(distance(p1, p2)).toBe(5)
		})
	})

	describe("distancePointToLine", () => {
		it("should calculate perpendicular distance to line segment", () => {
			const point: Point = { id: "1", x: 2, y: 2 }
			const lineStart: Point = { id: "2", x: 0, y: 0 }
			const lineEnd: Point = { id: "3", x: 4, y: 0 }

			// Point (2,2) to horizontal line from (0,0) to (4,0) should be 2
			expect(distancePointToLine(point, lineStart, lineEnd)).toBe(2)
		})

		it("should return distance to closest endpoint for point beyond segment", () => {
			const point: Point = { id: "1", x: 6, y: 1 }
			const lineStart: Point = { id: "2", x: 0, y: 0 }
			const lineEnd: Point = { id: "3", x: 4, y: 0 }

			// Distance from (6,1) to closest endpoint (4,0)
			const expected = Math.sqrt((6 - 4) ** 2 + (1 - 0) ** 2)
			expect(distancePointToLine(point, lineStart, lineEnd)).toBeCloseTo(
				expected,
				10
			)
		})

		it("should handle zero-length line (point to point)", () => {
			const point: Point = { id: "1", x: 3, y: 4 }
			const linePoint: Point = { id: "2", x: 0, y: 0 }

			expect(distancePointToLine(point, linePoint, linePoint)).toBe(5)
		})
	})

	describe("vectorDot", () => {
		it("should calculate dot product correctly", () => {
			const v1 = { x: 2, y: 3 }
			const v2 = { x: 4, y: 5 }

			// 2*4 + 3*5 = 8 + 15 = 23
			expect(vectorDot(v1, v2)).toBe(23)
		})

		it("should return 0 for perpendicular vectors", () => {
			const v1 = { x: 1, y: 0 }
			const v2 = { x: 0, y: 1 }

			expect(vectorDot(v1, v2)).toBe(0)
		})

		it("should handle zero vectors", () => {
			const v1 = { x: 0, y: 0 }
			const v2 = { x: 5, y: 3 }

			expect(vectorDot(v1, v2)).toBe(0)
		})
	})

	describe("vectorNormalize", () => {
		it("should normalize vector to unit length", () => {
			const v = { x: 3, y: 4 }
			const normalized = vectorNormalize(v)

			expect(normalized.x).toBeCloseTo(0.6, 10)
			expect(normalized.y).toBeCloseTo(0.8, 10)

			// Check that length is 1
			const length = Math.sqrt(normalized.x ** 2 + normalized.y ** 2)
			expect(length).toBeCloseTo(1, 10)
		})

		it("should handle zero vector gracefully", () => {
			const v = { x: 0, y: 0 }
			const normalized = vectorNormalize(v)

			expect(normalized.x).toBe(0)
			expect(normalized.y).toBe(0)
		})

		it("should not change unit vectors", () => {
			const v = { x: 1, y: 0 }
			const normalized = vectorNormalize(v)

			expect(normalized.x).toBeCloseTo(1, 10)
			expect(normalized.y).toBeCloseTo(0, 10)
		})
	})

	describe("vectorFromPoints", () => {
		it("should create vector from point1 to point2", () => {
			const p1: Point = { id: "1", x: 1, y: 2 }
			const p2: Point = { id: "2", x: 4, y: 6 }

			const vector = vectorFromPoints(p1, p2)

			expect(vector.x).toBe(3)
			expect(vector.y).toBe(4)
		})

		it("should handle negative differences", () => {
			const p1: Point = { id: "1", x: 5, y: 8 }
			const p2: Point = { id: "2", x: 2, y: 3 }

			const vector = vectorFromPoints(p1, p2)

			expect(vector.x).toBe(-3)
			expect(vector.y).toBe(-5)
		})
	})

	describe("clamp", () => {
		it("should clamp value within bounds", () => {
			expect(clamp(5, 0, 10)).toBe(5)
			expect(clamp(-5, 0, 10)).toBe(0)
			expect(clamp(15, 0, 10)).toBe(10)
		})

		it("should handle edge cases", () => {
			expect(clamp(0, 0, 10)).toBe(0)
			expect(clamp(10, 0, 10)).toBe(10)
		})

		it("should work with negative bounds", () => {
			expect(clamp(-5, -10, -1)).toBe(-5)
			expect(clamp(-15, -10, -1)).toBe(-10)
			expect(clamp(5, -10, -1)).toBe(-1)
		})
	})
})
