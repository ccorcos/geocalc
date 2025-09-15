import { distance } from "../math"
import { Constraint, Geometry } from "./types"
import { getCircleRadius } from "./geometry"

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
			case "angle":
				return this.evaluateAngle(constraint, geometry)
			case "radius":
				return this.evaluateFixRadius(constraint, geometry)
			case "point-on-circle":
				return this.evaluatePointOnCircle(constraint, geometry)
			case "line-tangent-to-circle":
				return this.evaluateLineTangentToCircle(constraint, geometry)
			case "colinear":
				return this.evaluateColinear(constraint, geometry)
			case "orthogonal-distance":
				return this.evaluateOrthogonalDistance(constraint, geometry)
			case "same-length":
				return this.evaluateSameLength(constraint, geometry)
			case "same-radius":
				return this.evaluateSameRadius(constraint, geometry)
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

		// Calculate direction vectors (not normalized yet)
		const v1x = p1b.x - p1a.x
		const v1y = p1b.y - p1a.y
		const v2x = p2b.x - p2a.x
		const v2y = p2b.y - p2a.y

		// Calculate magnitudes
		const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
		const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)

		if (mag1 < 1e-10 || mag2 < 1e-10) {
			// Degenerate case: one line has zero length
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Use slope-based approach for more direct parallel constraint
		// This avoids the length-increase issues of normalized dot product approach
		
		// Handle vertical lines specially
		const isVertical1 = Math.abs(v1x) < 1e-10
		const isVertical2 = Math.abs(v2x) < 1e-10
		
		let error: number
		let dErrorDS1: number // derivative with respect to slope1
		let dErrorDS2: number // derivative with respect to slope2
		
		if (isVertical1 && isVertical2) {
			// Both lines are vertical - already parallel
			error = 0
			dErrorDS1 = 0
			dErrorDS2 = 0
		} else if (isVertical1 || isVertical2) {
			// One line is vertical, other isn't - for parallel constraint, this should be a large error
			// Since a vertical line can only be parallel to another vertical line
			const slope = isVertical1 ? v2y / v2x : v1y / v1x
			error = 1 + slope * slope // Base error of 1 for vertical/non-vertical mismatch + slope error
			dErrorDS1 = isVertical1 ? 0 : 2 * slope
			dErrorDS2 = isVertical2 ? 0 : 2 * slope
		} else {
			// Both lines have finite slopes - use slope difference
			const slope1 = v1y / v1x
			const slope2 = v2y / v2x
			const slopeDiff = slope1 - slope2
			error = slopeDiff * slopeDiff
			dErrorDS1 = 2 * slopeDiff
			dErrorDS2 = -2 * slopeDiff
		}

		// If error is very small, zero out gradients to prevent numerical issues
		const gradient = new Map<string, { x: number; y: number }>()
		if (error < 1e-6) {
			// Lines are essentially parallel, zero gradients
			gradient.set(p1a.id, { x: 0, y: 0 })
			gradient.set(p1b.id, { x: 0, y: 0 })
			gradient.set(p2a.id, { x: 0, y: 0 })
			gradient.set(p2b.id, { x: 0, y: 0 })
		} else {
			// Calculate gradients using slope derivatives - much simpler and more direct
			// For non-vertical lines: slope = dy/dx
			// ∂(slope)/∂x = -dy/dx², ∂(slope)/∂y = 1/dx
			
			if (isVertical1 || isVertical2) {
				// Handle vertical line case - use different gradient calculation
				// This pushes the non-vertical line toward vertical
				const nonVerticalSlope = isVertical1 ? v2y / v2x : v1y / v1x
				const pushToVertical = 2 * nonVerticalSlope // Push slope toward infinity (vertical)
				
				if (isVertical2) {
					// Line 1 is not vertical, push it toward vertical
					const dx1Squared = v1x * v1x
					gradient.set(p1a.id, { x: pushToVertical * v1y / dx1Squared, y: -pushToVertical / v1x })
					gradient.set(p1b.id, { x: -pushToVertical * v1y / dx1Squared, y: pushToVertical / v1x })
					gradient.set(p2a.id, { x: 0, y: 0 })
					gradient.set(p2b.id, { x: 0, y: 0 })
				} else {
					// Line 2 is not vertical, push it toward vertical
					const dx2Squared = v2x * v2x
					gradient.set(p1a.id, { x: 0, y: 0 })
					gradient.set(p1b.id, { x: 0, y: 0 })
					gradient.set(p2a.id, { x: pushToVertical * v2y / dx2Squared, y: -pushToVertical / v2x })
					gradient.set(p2b.id, { x: -pushToVertical * v2y / dx2Squared, y: pushToVertical / v2x })
				}
			} else {
				// Both lines have finite slopes - use slope difference gradients
				const dx1Squared = v1x * v1x
				const dx2Squared = v2x * v2x
				
				// Gradients for slope1 (line 1)
				const dS1_dp1ax = dErrorDS1 * v1y / dx1Squared   // ∂(error)/∂(p1a.x) = dErrorDS1 * ∂(slope1)/∂(p1a.x)
				const dS1_dp1ay = dErrorDS1 * (-1 / v1x)         // ∂(error)/∂(p1a.y) = dErrorDS1 * ∂(slope1)/∂(p1a.y)
				const dS1_dp1bx = dErrorDS1 * (-v1y / dx1Squared) // ∂(error)/∂(p1b.x) = dErrorDS1 * ∂(slope1)/∂(p1b.x)
				const dS1_dp1by = dErrorDS1 * (1 / v1x)          // ∂(error)/∂(p1b.y) = dErrorDS1 * ∂(slope1)/∂(p1b.y)
				
				// Gradients for slope2 (line 2)
				const dS2_dp2ax = dErrorDS2 * v2y / dx2Squared   // ∂(error)/∂(p2a.x) = dErrorDS2 * ∂(slope2)/∂(p2a.x)
				const dS2_dp2ay = dErrorDS2 * (-1 / v2x)         // ∂(error)/∂(p2a.y) = dErrorDS2 * ∂(slope2)/∂(p2a.y)
				const dS2_dp2bx = dErrorDS2 * (-v2y / dx2Squared) // ∂(error)/∂(p2b.x) = dErrorDS2 * ∂(slope2)/∂(p2b.x)
				const dS2_dp2by = dErrorDS2 * (1 / v2x)          // ∂(error)/∂(p2b.y) = dErrorDS2 * ∂(slope2)/∂(p2b.y)

				// Scale gradients to ensure reasonable convergence speed
				// The issue is that for long lines, gradients become very small
				// Scale by the harmonic mean of line lengths to balance responsiveness
				const avgLineLength = 2 / (1/mag1 + 1/mag2)
				const scaleFactor = Math.max(10.0, avgLineLength / 10) // More aggressive scaling
				
				gradient.set(p1a.id, { x: dS1_dp1ax * scaleFactor, y: dS1_dp1ay * scaleFactor })
				gradient.set(p1b.id, { x: dS1_dp1bx * scaleFactor, y: dS1_dp1by * scaleFactor })
				gradient.set(p2a.id, { x: dS2_dp2ax * scaleFactor, y: dS2_dp2ay * scaleFactor })
				gradient.set(p2b.id, { x: dS2_dp2bx * scaleFactor, y: dS2_dp2by * scaleFactor })
			}
		}

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

		// Calculate direction vectors (not normalized yet)
		const v1x = p1b.x - p1a.x
		const v1y = p1b.y - p1a.y
		const v2x = p2b.x - p2a.x
		const v2y = p2b.y - p2a.y

		// Calculate magnitudes
		const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
		const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)

		if (mag1 < 1e-10 || mag2 < 1e-10) {
			// Degenerate case: one line has zero length
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Dot product of normalized vectors
		const dot = (v1x * v2x + v1y * v2y) / (mag1 * mag2)
		
		// For perpendicular lines, dot product should be 0
		// Error = dot²
		const error = dot * dot

		// Analytical gradient calculation
		// error = dot²
		// d(error)/d(dot) = 2 * dot
		const dErrorDDot = 2 * dot

		// If error is very small, zero out gradients to prevent numerical issues
		const gradient = new Map<string, { x: number; y: number }>()
		if (Math.abs(dot) < 1e-6) {
			// Lines are essentially perpendicular, zero gradients
			gradient.set(p1a.id, { x: 0, y: 0 })
			gradient.set(p1b.id, { x: 0, y: 0 })
			gradient.set(p2a.id, { x: 0, y: 0 })
			gradient.set(p2b.id, { x: 0, y: 0 })
		} else {
			// Calculate d(dot)/d(point) for each point
			// dot = (v1 · v2) / (|v1| * |v2|)
			const mag1Mag2 = mag1 * mag2
			const invMag1 = 1 / mag1
			const invMag2 = 1 / mag2

			// For p1a (affects v1 = p1b - p1a, so d(v1)/d(p1a) = -1)
			const dDotDx1a = (-v2x * mag2 + dot * v1x * invMag1) / mag1Mag2
			const dDotDy1a = (-v2y * mag2 + dot * v1y * invMag1) / mag1Mag2

			// For p1b (affects v1 = p1b - p1a, so d(v1)/d(p1b) = 1)  
			const dDotDx1b = (v2x * mag2 - dot * v1x * invMag1) / mag1Mag2
			const dDotDy1b = (v2y * mag2 - dot * v1y * invMag1) / mag1Mag2

			// For p2a (affects v2 = p2b - p2a, so d(v2)/d(p2a) = -1)
			const dDotDx2a = (-v1x * mag1 + dot * v2x * invMag2) / mag1Mag2
			const dDotDy2a = (-v1y * mag1 + dot * v2y * invMag2) / mag1Mag2

			// For p2b (affects v2 = p2b - p2a, so d(v2)/d(p2b) = 1)
			const dDotDx2b = (v1x * mag1 - dot * v2x * invMag2) / mag1Mag2
			const dDotDy2b = (v1y * mag1 - dot * v2y * invMag2) / mag1Mag2

			gradient.set(p1a.id, {
				x: dErrorDDot * dDotDx1a,
				y: dErrorDDot * dDotDy1a,
			})

			gradient.set(p1b.id, {
				x: dErrorDDot * dDotDx1b,
				y: dErrorDDot * dDotDy1b,
			})

			gradient.set(p2a.id, {
				x: dErrorDDot * dDotDx2a,
				y: dErrorDDot * dDotDy2a,
			})

			gradient.set(p2b.id, {
				x: dErrorDDot * dDotDx2b,
				y: dErrorDDot * dDotDy2b,
			})
		}

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateHorizontal(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		// Case 1: Single line constraint (like old horizontal constraint)
		if (constraint.entityIds.length === 1) {
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

		// Case 2: Multiple points constraint (like old same-y constraint)
		if (constraint.entityIds.length >= 2) {
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

			// Evaluate pairwise constraints between consecutive points (same Y coordinate)
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

		return { constraintId: constraint.id, error: 0, gradient: new Map() }
	}

	private evaluateVertical(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		// Case 1: Single line constraint (like old vertical constraint)
		if (constraint.entityIds.length === 1) {
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

		// Case 2: Multiple points constraint (like old same-x constraint)
		if (constraint.entityIds.length >= 2) {
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

			// Evaluate pairwise constraints between consecutive points (same X coordinate)
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

		return { constraintId: constraint.id, error: 0, gradient: new Map() }
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

		// Convert to distance constraint between center and radius point
		// Create virtual distance constraint
		const virtualDistanceConstraint: Constraint = {
			id: constraint.id,
			type: "distance",
			entityIds: [circle.centerId, circle.radiusPointId],
			value: constraint.value
		}
		
		return this.evaluateDistance(virtualDistanceConstraint, geometry)
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

	private evaluatePointOnCircle(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const point = geometry.points.get(constraint.entityIds[0])
		const circle = geometry.circles.get(constraint.entityIds[1])

		if (!point || !circle) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const center = geometry.points.get(circle.centerId)
		if (!center) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Distance from point to circle center
		const dx = point.x - center.x
		const dy = point.y - center.y
		const currentDistance = Math.sqrt(dx * dx + dy * dy)

		// Error: squared difference between current distance and circle radius
		const radius = getCircleRadius(circle, geometry)
		const error = (currentDistance - radius) ** 2

		// Gradient calculation
		const gradient = new Map<string, { x: number; y: number }>()

		if (currentDistance > 1e-10) {
			// Factor for gradient: 2 * (currentDistance - radius) / currentDistance
			const factor = (2 * (currentDistance - radius)) / currentDistance

			// Gradient for the point (moves toward/away from center)
			gradient.set(point.id, {
				x: factor * dx,
				y: factor * dy,
			})

			// Gradient for the center (opposite direction)
			gradient.set(center.id, {
				x: -factor * dx,
				y: -factor * dy,
			})
		} else {
			// Degenerate case: point is at center
			gradient.set(point.id, { x: 0, y: 0 })
			gradient.set(center.id, { x: 0, y: 0 })
		}

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateLineTangentToCircle(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const line = geometry.lines.get(constraint.entityIds[0])
		const circle = geometry.circles.get(constraint.entityIds[1])

		if (!line || !circle) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const p1 = geometry.points.get(line.point1Id)
		const p2 = geometry.points.get(line.point2Id)
		const center = geometry.points.get(circle.centerId)

		if (!p1 || !p2 || !center) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Line direction vector
		const dx = p2.x - p1.x
		const dy = p2.y - p1.y
		const lineLength = Math.sqrt(dx * dx + dy * dy)

		if (lineLength < 1e-10) {
			// Degenerate case: line has zero length
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Normalized line direction
		const nx = dx / lineLength
		const ny = dy / lineLength

		// Vector from line start to circle center
		const cx = center.x - p1.x
		const cy = center.y - p1.y

		// Project center onto line to find closest point
		const projLength = cx * nx + cy * ny
		const closestX = p1.x + projLength * nx
		const closestY = p1.y + projLength * ny

		// Distance from center to closest point on line
		const distX = center.x - closestX
		const distY = center.y - closestY
		const distanceToLine = Math.sqrt(distX * distX + distY * distY)

		// Error: squared difference between distance and radius
		const radius = getCircleRadius(circle, geometry)
		const error = (distanceToLine - radius) ** 2

		// Gradient calculation using simpler geometric approach
		const gradient = new Map<string, { x: number; y: number }>()

		if (distanceToLine > 1e-10) {
			// Unit vector from closest point on line to center
			const unitDistX = distX / distanceToLine
			const unitDistY = distY / distanceToLine

			// Error derivative factor
			const errorDerivative = 2 * (distanceToLine - radius)

			// Gradient for circle center (simple: move toward/away from line)
			gradient.set(center.id, {
				x: errorDerivative * unitDistX,
				y: errorDerivative * unitDistY,
			})

			// Gradients for line points (more complex: how moving the line affects distance)
			// For simplicity, we'll use a scaling factor to ensure reasonable convergence
			const scaleFactor = Math.max(1.0, lineLength / 50.0)

			// Moving p1 in direction perpendicular to line affects distance
			const perpX = -ny  // perpendicular to line direction
			const perpY = nx

			// If center is on positive side of perpendicular, gradients should move line away
			const centerSide = distX * perpX + distY * perpY
			const sideSign = centerSide >= 0 ? 1 : -1

			gradient.set(p1.id, {
				x: -errorDerivative * perpX * sideSign * scaleFactor,
				y: -errorDerivative * perpY * sideSign * scaleFactor,
			})

			gradient.set(p2.id, {
				x: -errorDerivative * perpX * sideSign * scaleFactor,
				y: -errorDerivative * perpY * sideSign * scaleFactor,
			})
		} else {
			// Center is exactly on the line, use zero gradients
			gradient.set(p1.id, { x: 0, y: 0 })
			gradient.set(p2.id, { x: 0, y: 0 })
			gradient.set(center.id, { x: 0, y: 0 })
		}

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateColinear(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length < 3) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Get all points, filtering out any that don't exist
		const points = constraint.entityIds
			.map((id) => ({ id, point: geometry.points.get(id) }))
			.filter(({ point }) => point !== undefined) as Array<{
			id: string
			point: NonNullable<ReturnType<typeof geometry.points.get>>
		}>

		if (points.length < 3) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Use first two points to define the reference line
		const p1 = points[0].point
		const p2 = points[1].point

		// Line direction vector
		const dx = p2.x - p1.x
		const dy = p2.y - p1.y
		const lineLength = Math.sqrt(dx * dx + dy * dy)

		if (lineLength < 1e-10) {
			// Degenerate case: first two points are coincident
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Normalized line direction
		const nx = dx / lineLength
		const ny = dy / lineLength

		let totalError = 0
		const totalGradient = new Map<string, { x: number; y: number }>()

		// Initialize gradients for all points
		for (const { id } of points) {
			totalGradient.set(id, { x: 0, y: 0 })
		}

		// For each point after the first two, calculate distance to line
		for (let i = 2; i < points.length; i++) {
			const point = points[i].point
			const pointId = points[i].id

			// Vector from line start to point
			const cx = point.x - p1.x
			const cy = point.y - p1.y

			// Project point onto line
			const projLength = cx * nx + cy * ny
			const closestX = p1.x + projLength * nx
			const closestY = p1.y + projLength * ny

			// Distance from point to line (perpendicular distance)
			const distX = point.x - closestX
			const distY = point.y - closestY
			const distanceToLine = Math.sqrt(distX * distX + distY * distY)

			// Error is squared distance to line
			const pointError = distanceToLine ** 2
			totalError += pointError

			// Calculate gradients
			if (distanceToLine > 1e-10) {
				// Unit vector from closest point on line to the point
				const unitDistX = distX / distanceToLine
				const unitDistY = distY / distanceToLine

				// Error derivative factor (for minimizing distance²)
				const errorDerivative = 2 * distanceToLine

				// Gradient for the point (move toward line - negative direction)
				const pointGrad = totalGradient.get(pointId)!
				pointGrad.x += -errorDerivative * unitDistX
				pointGrad.y += -errorDerivative * unitDistY

				// Gradients for line points (p1 and p2)
				// Use conservative scaling to prevent solver instability
				const scaleFactor = Math.max(0.1, Math.min(1.0, lineLength / 50.0))

				// Perpendicular to line direction
				const perpX = -ny
				const perpY = nx

				// Determine which side of the line the point is on
				const crossProduct = distX * perpX + distY * perpY
				const sideSign = crossProduct >= 0 ? 1 : -1

				// Gradients for line endpoints (move line toward the point)
				const p1Grad = totalGradient.get(points[0].id)!
				const p2Grad = totalGradient.get(points[1].id)!

				p1Grad.x += -errorDerivative * perpX * sideSign * scaleFactor
				p1Grad.y += -errorDerivative * perpY * sideSign * scaleFactor

				p2Grad.x += -errorDerivative * perpX * sideSign * scaleFactor
				p2Grad.y += -errorDerivative * perpY * sideSign * scaleFactor
			}
		}

		return {
			constraintId: constraint.id,
			error: totalError,
			gradient: totalGradient,
		}
	}

	private evaluateOrthogonalDistance(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length !== 2 || constraint.value === undefined) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// First entity should be a point, second should be a line
		const point = geometry.points.get(constraint.entityIds[0])
		const line = geometry.lines.get(constraint.entityIds[1])

		if (!point || !line) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		const p1 = geometry.points.get(line.point1Id)
		const p2 = geometry.points.get(line.point2Id)

		if (!p1 || !p2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Line direction vector
		const dx = p2.x - p1.x
		const dy = p2.y - p1.y
		const lineLength = Math.sqrt(dx * dx + dy * dy)

		if (lineLength < 1e-10) {
			// Degenerate case: line has zero length
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Normalized line direction
		const nx = dx / lineLength
		const ny = dy / lineLength

		// Vector from line start to point
		const cx = point.x - p1.x
		const cy = point.y - p1.y

		// Project point onto line
		const projLength = cx * nx + cy * ny
		const closestX = p1.x + projLength * nx
		const closestY = p1.y + projLength * ny

		// Distance from point to line (perpendicular distance)
		const distX = point.x - closestX
		const distY = point.y - closestY
		const currentDistance = Math.sqrt(distX * distX + distY * distY)

		// Error is squared difference between current distance and target
		const targetDistance = constraint.value
		const error = (currentDistance - targetDistance) ** 2

		// Calculate gradients
		const gradient = new Map<string, { x: number; y: number }>()

		if (currentDistance > 1e-10) {
			// Unit vector from closest point on line to the point
			const unitDistX = distX / currentDistance
			const unitDistY = distY / currentDistance

			// Error derivative factor
			const errorDerivative = 2 * (currentDistance - targetDistance)

			// Gradient for the point (move to maintain target distance)
			gradient.set(point.id, {
				x: errorDerivative * unitDistX,
				y: errorDerivative * unitDistY,
			})

			// Gradients for line points (p1 and p2)
			const scaleFactor = Math.max(0.1, Math.min(1.0, lineLength / 50.0))

			// Perpendicular to line direction
			const perpX = -ny
			const perpY = nx

			// Determine which side of the line the point is on
			const crossProduct = distX * perpX + distY * perpY
			const sideSign = crossProduct >= 0 ? 1 : -1

			// Gradients for line endpoints
			gradient.set(p1.id, {
				x: -errorDerivative * perpX * sideSign * scaleFactor,
				y: -errorDerivative * perpY * sideSign * scaleFactor,
			})

			gradient.set(p2.id, {
				x: -errorDerivative * perpX * sideSign * scaleFactor,
				y: -errorDerivative * perpY * sideSign * scaleFactor,
			})
		} else {
			// Point is exactly on the line - need to move perpendicular to it
			// to achieve the target distance
			const perpX = -ny
			const perpY = nx
			const errorDerivative = 2 * (0 - targetDistance) // current distance = 0

			gradient.set(point.id, {
				x: errorDerivative * perpX, // Move perpendicular to line
				y: errorDerivative * perpY,
			})

			gradient.set(p1.id, { x: 0, y: 0 })
			gradient.set(p2.id, { x: 0, y: 0 })
		}

		return { constraintId: constraint.id, error, gradient }
	}

	private evaluateSameLength(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Get all lines, filtering out any that don't exist
		const lines = constraint.entityIds
			.map((id) => ({ id, line: geometry.lines.get(id) }))
			.filter(({ line }) => line !== undefined) as Array<{
			id: string
			line: NonNullable<ReturnType<typeof geometry.lines.get>>
		}>

		if (lines.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Get all line endpoints
		const lineData = lines.map(({ id, line }) => {
			const p1 = geometry.points.get(line.point1Id)
			const p2 = geometry.points.get(line.point2Id)
			if (!p1 || !p2) return null
			
			const length = distance(p1, p2)
			return { id, line, p1, p2, length }
		}).filter((data) => data !== null)

		if (lineData.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Use first line as reference length
		const referenceLength = lineData[0]!.length
		let totalError = 0
		const totalGradient = new Map<string, { x: number; y: number }>()

		// Initialize gradients for all points
		for (const data of lineData) {
			if (data) {
				totalGradient.set(data.p1.id, { x: 0, y: 0 })
				totalGradient.set(data.p2.id, { x: 0, y: 0 })
			}
		}

		// For each line after the first, constrain its length to match the reference
		for (let i = 1; i < lineData.length; i++) {
			const data = lineData[i]!
			const currentLength = data.length
			const lengthError = currentLength - referenceLength
			const pairError = lengthError ** 2
			totalError += pairError

			// Calculate gradients for this line pair
			if (currentLength > 1e-10) {
				// Gradient factor for length constraint
				const factor = (2 * lengthError) / currentLength

				// Direction vector for current line
				const dx = data.p2.x - data.p1.x
				const dy = data.p2.y - data.p1.y

				// Gradients for current line endpoints
				const grad1 = totalGradient.get(data.p1.id)!
				const grad2 = totalGradient.get(data.p2.id)!

				grad1.x += factor * (-dx)
				grad1.y += factor * (-dy)
				grad2.x += factor * dx
				grad2.y += factor * dy

				// Counter-gradients for reference line (first line)
				const refData = lineData[0]!
				const refLength = refData.length
				
				if (refLength > 1e-10) {
					const refFactor = (-2 * lengthError) / refLength
					const refDx = refData.p2.x - refData.p1.x
					const refDy = refData.p2.y - refData.p1.y

					const refGrad1 = totalGradient.get(refData.p1.id)!
					const refGrad2 = totalGradient.get(refData.p2.id)!

					refGrad1.x += refFactor * (-refDx)
					refGrad1.y += refFactor * (-refDy)
					refGrad2.x += refFactor * refDx
					refGrad2.y += refFactor * refDy
				}
			}
		}

		return {
			constraintId: constraint.id,
			error: totalError,
			gradient: totalGradient,
		}
	}

	private evaluateSameRadius(
		constraint: Constraint,
		geometry: Geometry
	): ConstraintViolation {
		if (constraint.entityIds.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Get all circles, filtering out any that don't exist
		const circles = constraint.entityIds
			.map((id) => ({ id, circle: geometry.circles.get(id) }))
			.filter(({ circle }) => circle !== undefined) as Array<{
			id: string
			circle: NonNullable<ReturnType<typeof geometry.circles.get>>
		}>

		if (circles.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Get all circle data (center and radius point)
		const circleData = circles.map(({ id, circle }) => {
			const center = geometry.points.get(circle.centerId)
			const radiusPoint = geometry.points.get(circle.radiusPointId)
			if (!center || !radiusPoint) return null
			
			const radius = distance(center, radiusPoint)
			return { id, circle, center, radiusPoint, radius }
		}).filter((data) => data !== null)

		if (circleData.length < 2) {
			return { constraintId: constraint.id, error: 0, gradient: new Map() }
		}

		// Use first circle as reference radius
		const referenceRadius = circleData[0]!.radius
		let totalError = 0
		const totalGradient = new Map<string, { x: number; y: number }>()

		// Initialize gradients for all points
		for (const data of circleData) {
			if (data) {
				totalGradient.set(data.center.id, { x: 0, y: 0 })
				totalGradient.set(data.radiusPoint.id, { x: 0, y: 0 })
			}
		}

		// For each circle after the first, constrain its radius to match the reference
		for (let i = 1; i < circleData.length; i++) {
			const data = circleData[i]!
			const currentRadius = data.radius
			const radiusError = currentRadius - referenceRadius
			const pairError = radiusError ** 2
			totalError += pairError

			// Calculate gradients for this circle pair (same as distance constraint)
			if (currentRadius > 1e-10) {
				// Gradient factor for radius constraint
				const factor = (2 * radiusError) / currentRadius

				// Direction vector from center to radius point
				const dx = data.radiusPoint.x - data.center.x
				const dy = data.radiusPoint.y - data.center.y

				// Gradients for current circle
				const centerGrad = totalGradient.get(data.center.id)!
				const radiusPointGrad = totalGradient.get(data.radiusPoint.id)!

				centerGrad.x += factor * (-dx)
				centerGrad.y += factor * (-dy)
				radiusPointGrad.x += factor * dx
				radiusPointGrad.y += factor * dy

				// Counter-gradients for reference circle (first circle)
				const refData = circleData[0]!
				const refRadius = refData.radius
				
				if (refRadius > 1e-10) {
					const refFactor = (-2 * radiusError) / refRadius
					const refDx = refData.radiusPoint.x - refData.center.x
					const refDy = refData.radiusPoint.y - refData.center.y

					const refCenterGrad = totalGradient.get(refData.center.id)!
					const refRadiusPointGrad = totalGradient.get(refData.radiusPoint.id)!

					refCenterGrad.x += refFactor * (-refDx)
					refCenterGrad.y += refFactor * (-refDy)
					refRadiusPointGrad.x += refFactor * refDx
					refRadiusPointGrad.y += refFactor * refDy
				}
			}
		}

		return {
			constraintId: constraint.id,
			error: totalError,
			gradient: totalGradient,
		}
	}
}
