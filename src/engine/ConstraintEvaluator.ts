import { distance, vectorDot, vectorFromPoints, vectorNormalize } from "../math"
import { Constraint, Geometry } from "./types"

export interface ConstraintViolation {
	constraintId: string
	error: number
	gradient: Map<string, { x: number; y: number }>
}

export class ConstraintEvaluator {
	evaluate(constraint: Constraint, geometry: Geometry): ConstraintViolation {
		switch (constraint.type) {
			case "distance":
				return this.evaluateDistance(constraint, geometry)
			case "x-distance":
				return this.evaluateXDistance(constraint, geometry)
			case "y-distance":
				return this.evaluateYDistance(constraint, geometry)
			case "parallel":
				return this.evaluateParallel(constraint, geometry)
			case "perpendicular":
				return this.evaluatePerpendicular(constraint, geometry)
			case "horizontal":
				return this.evaluateHorizontal(constraint, geometry)
			case "vertical":
				return this.evaluateVertical(constraint, geometry)
			case "x":
				return this.evaluateFixX(constraint, geometry)
			case "y":
				return this.evaluateFixY(constraint, geometry)
			case "same-x":
				return this.evaluateSameX(constraint, geometry)
			case "same-y":
				return this.evaluateSameY(constraint, geometry)
			case "angle":
				return this.evaluateAngle(constraint, geometry)
			case "radius":
				return this.evaluateFixRadius(constraint, geometry)
			default:
				return {
					constraintId: constraint.id,
					error: 0,
					gradient: new Map(),
				}
		}
	}

	private evaluateDistance(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 2 || constraint.value === undefined) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const point1 = geometry.points.get(constraint.entityIds[0])
		const point2 = geometry.points.get(constraint.entityIds[1])

		if (!point1 || !point2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const currentDistance = distance(point1, point2)
		const targetDistance = constraint.value
		const error = (currentDistance - targetDistance) ** 2

		// Gradient calculation
		const gradient = new Map<string, { x: number; y: number }>()

		if (currentDistance > 0) {
			const factor = (2 * (currentDistance - targetDistance)) / currentDistance

			gradient.set(point1.id, {
				x: factor * (point1.x - point2.x),
				y: factor * (point1.y - point2.y),
			})

			gradient.set(point2.id, {
				x: factor * (point2.x - point1.x),
				y: factor * (point2.y - point1.y),
			})
		}

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateParallel(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const line1 = geometry.lines.get(constraint.entityIds[0])
		const line2 = geometry.lines.get(constraint.entityIds[1])

		if (!line1 || !line2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const p1a = geometry.points.get(line1.point1Id)
		const p1b = geometry.points.get(line1.point2Id)
		const p2a = geometry.points.get(line2.point1Id)
		const p2b = geometry.points.get(line2.point2Id)

		if (!p1a || !p1b || !p2a || !p2b) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const v1 = vectorNormalize(vectorFromPoints(p1a, p1b))
		const v2 = vectorNormalize(vectorFromPoints(p2a, p2b))

		// For parallel lines, dot product should be ±1
		const dot = vectorDot(v1, v2)
		const error = (1 - dot * dot) ** 2

		// Simplified gradient calculation (more complex analytical gradient would be better)
		const gradient = new Map<string, { x: number; y: number }>()
		const epsilon = 1e-6

		// Numerical gradient approximation
		;[p1a, p1b, p2a, p2b].forEach((point) => {
			const originalX = point.x
			const originalY = point.y

			// X gradient
			point.x = originalX + epsilon
			const v1x = vectorNormalize(vectorFromPoints(p1a, p1b))
			const v2x = vectorNormalize(vectorFromPoints(p2a, p2b))
			const dotX = vectorDot(v1x, v2x)
			const errorX = (1 - dotX * dotX) ** 2

			point.x = originalX

			// Y gradient
			point.y = originalY + epsilon
			const v1y = vectorNormalize(vectorFromPoints(p1a, p1b))
			const v2y = vectorNormalize(vectorFromPoints(p2a, p2b))
			const dotY = vectorDot(v1y, v2y)
			const errorY = (1 - dotY * dotY) ** 2

			point.y = originalY

			gradient.set(point.id, {
				x: (errorX - error) / epsilon,
				y: (errorY - error) / epsilon,
			})
		})

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluatePerpendicular(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const line1 = geometry.lines.get(constraint.entityIds[0])
		const line2 = geometry.lines.get(constraint.entityIds[1])

		if (!line1 || !line2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const p1a = geometry.points.get(line1.point1Id)
		const p1b = geometry.points.get(line1.point2Id)
		const p2a = geometry.points.get(line2.point1Id)
		const p2b = geometry.points.get(line2.point2Id)

		if (!p1a || !p1b || !p2a || !p2b) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const v1 = vectorNormalize(vectorFromPoints(p1a, p1b))
		const v2 = vectorNormalize(vectorFromPoints(p2a, p2b))

		// For perpendicular lines, dot product should be 0
		const dot = vectorDot(v1, v2)
		const error = dot ** 2

		// Numerical gradient (similar to parallel)
		const gradient = new Map<string, { x: number; y: number }>()
		const epsilon = 1e-6

		;[p1a, p1b, p2a, p2b].forEach((point) => {
			const originalX = point.x
			const originalY = point.y

			// X gradient
			point.x = originalX + epsilon
			const v1x = vectorNormalize(vectorFromPoints(p1a, p1b))
			const v2x = vectorNormalize(vectorFromPoints(p2a, p2b))
			const dotX = vectorDot(v1x, v2x)
			const errorX = dotX ** 2

			point.x = originalX

			// Y gradient
			point.y = originalY + epsilon
			const v1y = vectorNormalize(vectorFromPoints(p1a, p1b))
			const v2y = vectorNormalize(vectorFromPoints(p2a, p2b))
			const dotY = vectorDot(v1y, v2y)
			const errorY = dotY ** 2

			point.y = originalY

			gradient.set(point.id, {
				x: (errorX - error) / epsilon,
				y: (errorY - error) / epsilon,
			})
		})

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateHorizontal(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 1) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const line = geometry.lines.get(constraint.entityIds[0])
		if (!line) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const p1 = geometry.points.get(line.point1Id)
		const p2 = geometry.points.get(line.point2Id)

		if (!p1 || !p2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const dy = p2.y - p1.y
		const error = dy ** 2

		const gradient = new Map<string, { x: number; y: number }>()

		gradient.set(p1.id, { x: 0, y: -2 * dy })
		gradient.set(p2.id, { x: 0, y: 2 * dy })

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateVertical(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 1) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const line = geometry.lines.get(constraint.entityIds[0])
		if (!line) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const p1 = geometry.points.get(line.point1Id)
		const p2 = geometry.points.get(line.point2Id)

		if (!p1 || !p2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const dx = p2.x - p1.x
		const error = dx ** 2

		const gradient = new Map<string, { x: number; y: number }>()

		gradient.set(p1.id, { x: -2 * dx, y: 0 })
		gradient.set(p2.id, { x: 2 * dx, y: 0 })

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateFixX(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 1 || constraint.value === undefined) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const point = geometry.points.get(constraint.entityIds[0])
		if (!point) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const targetX = constraint.value
		const currentX = point.x
		const error = (currentX - targetX) ** 2

		const gradient = new Map<string, { x: number; y: number }>()
		gradient.set(point.id, {
			x: 2 * (currentX - targetX), // Gradient with respect to x
			y: 0, // No gradient with respect to y
		})

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateFixY(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 1 || constraint.value === undefined) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const point = geometry.points.get(constraint.entityIds[0])
		if (!point) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const targetY = constraint.value
		const currentY = point.y
		const error = (currentY - targetY) ** 2

		const gradient = new Map<string, { x: number; y: number }>()
		gradient.set(point.id, {
			x: 0, // No gradient with respect to x
			y: 2 * (currentY - targetY), // Gradient with respect to y
		})

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateSameX(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Get all points, filtering out any that don't exist
		const points = constraint.entityIds
			.map((id) => ({ id, point: geometry.points.get(id) }))
			.filter(({ point }) => point !== undefined) as Array<{
			id: string
			point: NonNullable<ReturnType<typeof geometry.points.get>>
		}>

		if (points.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Handle N-point constraints with pairwise evaluation
		let totalError = 0
		const totalGradient = new Map<string, { x: number; y: number }>()

		// Initialize gradients for all points
		for (const { id } of points) {
			totalGradient.set(id, { x: 0, y: 0 })
		}

		// Evaluate pairwise constraints between consecutive points
		for (let i = 0; i < points.length - 1; i++) {
			const point1 = points[i]
			const point2 = points[i + 1]

			// Error is the squared difference between x-coordinates
			const dx = point1.point.x - point2.point.x
			const pairError = dx ** 2
			totalError += pairError

			// Accumulate gradients: d/dx1 = 2*(x1-x2), d/dx2 = 2*(x2-x1)
			const grad1 = totalGradient.get(point1.id)!
			const grad2 = totalGradient.get(point2.id)!

			grad1.x += 2 * dx
			grad2.x += -2 * dx
		}

		return {
			constraintId: constraint.id,
			error: totalError,
			gradient: totalGradient,
		}
	}

	private evaluateSameY(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Get all points, filtering out any that don't exist
		const points = constraint.entityIds
			.map((id) => ({ id, point: geometry.points.get(id) }))
			.filter(({ point }) => point !== undefined) as Array<{
			id: string
			point: NonNullable<ReturnType<typeof geometry.points.get>>
		}>

		if (points.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Handle N-point constraints with pairwise evaluation
		let totalError = 0
		const totalGradient = new Map<string, { x: number; y: number }>()

		// Initialize gradients for all points
		for (const { id } of points) {
			totalGradient.set(id, { x: 0, y: 0 })
		}

		// Evaluate pairwise constraints between consecutive points
		for (let i = 0; i < points.length - 1; i++) {
			const point1 = points[i]
			const point2 = points[i + 1]

			// Error is the squared difference between y-coordinates
			const dy = point1.point.y - point2.point.y
			const pairError = dy ** 2
			totalError += pairError

			// Accumulate gradients: d/dy1 = 2*(y1-y2), d/dy2 = 2*(y2-y1)
			const grad1 = totalGradient.get(point1.id)!
			const grad2 = totalGradient.get(point2.id)!

			grad1.y += 2 * dy
			grad2.y += -2 * dy
		}

		return {
			constraintId: constraint.id,
			error: totalError,
			gradient: totalGradient,
		}
	}

	private evaluateAngle(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 3 || constraint.value === undefined) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const point1 = geometry.points.get(constraint.entityIds[0])
		const point2 = geometry.points.get(constraint.entityIds[1]) // vertex point
		const point3 = geometry.points.get(constraint.entityIds[2])

		if (!point1 || !point2 || !point3) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Calculate vectors from vertex to other two points
		const v1x = point1.x - point2.x
		const v1y = point1.y - point2.y
		const v2x = point3.x - point2.x
		const v2y = point3.y - point2.y

		// Calculate magnitudes
		const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
		const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)

		if (mag1 < 1e-10 || mag2 < 1e-10) {
			// Degenerate case: points too close
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Calculate current angle using dot product
		const dotProduct = v1x * v2x + v1y * v2y
		const cosCurrentAngle = dotProduct / (mag1 * mag2)

		// Clamp to avoid numerical issues with acos
		const clampedCos = Math.max(-1, Math.min(1, cosCurrentAngle))
		const currentAngle = Math.acos(clampedCos)

		// Target angle in radians
		const targetAngle = constraint.value * (Math.PI / 180) // Convert degrees to radians

		// Error is squared difference in angles
		const angleError = currentAngle - targetAngle
		const error = angleError ** 2

		// Calculate analytical gradients (much more accurate than numerical approximation)
		const gradient = new Map<string, { x: number; y: number }>()

		// For angle constraint error = (θ - θ_target)²
		// We need ∂error/∂x and ∂error/∂y for each point
		// ∂error/∂x = 2(θ - θ_target) * ∂θ/∂x

		const errorFactor = 2 * angleError // 2(θ - θ_target)

		// Increase threshold to prevent near-satisfied constraints from interfering
		// Use angle-based threshold: if angle error < 0.1 degrees, zero out gradients
		const angleErrorThreshold = 0.1 * (Math.PI / 180) // 0.1 degrees in radians
		if (Math.abs(angleError) < angleErrorThreshold) {
			// If angle error is essentially zero, gradients should be zero
			gradient.set(point1.id, { x: 0, y: 0 })
			gradient.set(point2.id, { x: 0, y: 0 })
			gradient.set(point3.id, { x: 0, y: 0 })
		} else {
			// Calculate ∂θ/∂x and ∂θ/∂y for each point
			// Using the chain rule: ∂θ/∂x = (∂θ/∂cos) * (∂cos/∂x)
			// where ∂θ/∂cos = -1/sin(θ) = -1/√(1-cos²(θ))

			const sinCurrentAngle = Math.sqrt(
				Math.max(0, 1 - cosCurrentAngle * cosCurrentAngle)
			)
			if (sinCurrentAngle < 1e-6) {
				// Degenerate case: angle is very close to 0° or 180°
				// Use a small perturbation to avoid division by zero
				gradient.set(point1.id, { x: 0, y: 0 })
				gradient.set(point2.id, { x: 0, y: 0 })
				gradient.set(point3.id, { x: 0, y: 0 })
			} else {
				const dThetaDCos = -1 / sinCurrentAngle

				// Calculate ∂cos/∂x and ∂cos/∂y for each point
				// cos = (v1·v2)/(|v1||v2|)
				const mag1Mag2 = mag1 * mag2
				const invMag1 = 1 / mag1
				const invMag2 = 1 / mag2

				// For point1 (affects v1 = point1 - point2)
				const dCosDx1 = (v2x * mag2 - dotProduct * v1x * invMag1) / mag1Mag2
				const dCosDy1 = (v2y * mag2 - dotProduct * v1y * invMag1) / mag1Mag2

				// For point3 (affects v2 = point3 - point2)
				const dCosDx3 = (v1x * mag1 - dotProduct * v2x * invMag2) / mag1Mag2
				const dCosDy3 = (v1y * mag1 - dotProduct * v2y * invMag2) / mag1Mag2

				// For point2 (vertex, affects both v1 and v2)
				const dCosDx2 = -(dCosDx1 + dCosDx3)
				const dCosDy2 = -(dCosDy1 + dCosDy3)

				gradient.set(point1.id, {
					x: errorFactor * dThetaDCos * dCosDx1,
					y: errorFactor * dThetaDCos * dCosDy1,
				})

				gradient.set(point2.id, {
					x: errorFactor * dThetaDCos * dCosDx2,
					y: errorFactor * dThetaDCos * dCosDy2,
				})

				gradient.set(point3.id, {
					x: errorFactor * dThetaDCos * dCosDx3,
					y: errorFactor * dThetaDCos * dCosDy3,
				})
			}
		}

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateFixRadius(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 1 || constraint.value === undefined) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const circle = geometry.circles.get(constraint.entityIds[0])
		if (!circle) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const targetRadius = constraint.value
		const currentRadius = circle.radius
		const error = (currentRadius - targetRadius) ** 2

		// For radius constraints, we don't allow the radius to change
		// The gradient affects the center point to maintain the fixed radius
		const gradient = new Map<string, { x: number; y: number }>()

		// For circles, we typically don't apply gradients to constrain radius directly
		// since radius is a property of the circle, not a point position
		// This constraint would be handled by preventing radius changes in the solver

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateXDistance(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 2 || constraint.value === undefined) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const point1 = geometry.points.get(constraint.entityIds[0])
		const point2 = geometry.points.get(constraint.entityIds[1])

		if (!point1 || !point2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const targetXDistance = constraint.value
		// Preserve direction: point2.x - point1.x (positive means point2 is to the right of point1)
		const currentXDistance = point2.x - point1.x
		const error = (currentXDistance - targetXDistance) ** 2

		const gradient = new Map<string, { x: number; y: number }>()
		const errorDerivative = 2 * (currentXDistance - targetXDistance)

		// Gradient: d/dx1 = -errorDerivative, d/dx2 = errorDerivative
		gradient.set(point1.id, { x: -errorDerivative, y: 0 })
		gradient.set(point2.id, { x: errorDerivative, y: 0 })

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateYDistance(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 2 || constraint.value === undefined) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const point1 = geometry.points.get(constraint.entityIds[0])
		const point2 = geometry.points.get(constraint.entityIds[1])

		if (!point1 || !point2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const targetYDistance = constraint.value
		// Preserve direction: point2.y - point1.y (positive means point2 is above point1)
		const currentYDistance = point2.y - point1.y
		const error = (currentYDistance - targetYDistance) ** 2

		const gradient = new Map<string, { x: number; y: number }>()
		const errorDerivative = 2 * (currentYDistance - targetYDistance)

		// Gradient: d/dy1 = -errorDerivative, d/dy2 = errorDerivative
		gradient.set(point1.id, { x: 0, y: -errorDerivative })
		gradient.set(point2.id, { x: 0, y: errorDerivative })

		return { constraintId: constraint.id, error, gradient }
	}
}
