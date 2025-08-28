import {
  ConstraintEvaluator,
  ConstraintViolation,
} from "./ConstraintEvaluator";
import { Geometry } from "./types";

interface SolverOptions {
  maxIterations: number;
  tolerance: number;
  learningRate: number;
  momentum: number;
}

interface SolverResult {
  success: boolean;
  iterations: number;
  finalError: number;
  geometry: Geometry;
}

export class GradientDescentSolver {
  private evaluator = new ConstraintEvaluator();
  private velocity = new Map<string, { x: number; y: number }>();

  solve(
    geometry: Geometry,
    options: SolverOptions = {
      maxIterations: 200,
      tolerance: 1e-8,
      learningRate: 0.1,
      momentum: 0.8,
    }
  ): SolverResult {
    let currentGeometry = this.cloneGeometry(geometry);
    this.currentGeometry = currentGeometry; // Track for constraint priorities
    let totalError = this.calculateTotalError(currentGeometry);

    for (let iteration = 0; iteration < options.maxIterations; iteration++) {
      // Calculate all constraint violations and gradients
      const violations = this.evaluateAllConstraints(currentGeometry);

      if (violations.length === 0) {
        this.currentGeometry = null; // Cleanup
        return {
          success: true,
          iterations: iteration,
          finalError: 0,
          geometry: currentGeometry,
        };
      }

      // Aggregate gradients for each point
      const aggregatedGradients = this.aggregateGradients(violations);

      // Update point positions using gradient descent with momentum
      let hasMovement = false;
      aggregatedGradients.forEach((gradient, pointId) => {
        const point = currentGeometry.points.get(pointId);
        if (!point) return;

        // Get or initialize velocity for this point
        if (!this.velocity.has(pointId)) {
          this.velocity.set(pointId, { x: 0, y: 0 });
        }
        const velocity = this.velocity.get(pointId)!;

        // Update velocity with momentum
        velocity.x =
          options.momentum * velocity.x - options.learningRate * gradient.x;
        velocity.y =
          options.momentum * velocity.y - options.learningRate * gradient.y;

        // Update position
        const newX = point.x + velocity.x;
        const newY = point.y + velocity.y;

        // Check if there's actual movement
        if (
          Math.abs(newX - point.x) > options.tolerance ||
          Math.abs(newY - point.y) > options.tolerance
        ) {
          hasMovement = true;
        }

        point.x = newX;
        point.y = newY;
      });

      // Calculate new total error
      const newTotalError = this.calculateTotalError(currentGeometry);

      // Check for convergence
      if (
        !hasMovement ||
        Math.abs(totalError - newTotalError) < options.tolerance
      ) {
        this.currentGeometry = null; // Cleanup
        return {
          success: newTotalError < 0.5, // Success if error is reasonable for complex systems
          iterations: iteration + 1,
          finalError: newTotalError,
          geometry: currentGeometry,
        };
      }

      totalError = newTotalError;
    }

    // Cleanup
    this.currentGeometry = null;

    return {
      success: false,
      iterations: options.maxIterations,
      finalError: totalError,
      geometry: currentGeometry,
    };
  }

  private evaluateAllConstraints(geometry: Geometry): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    geometry.constraints.forEach((constraint) => {
      const violation = this.evaluator.evaluate(constraint, geometry);
      if (violation.error > 0) {
        violations.push(violation);
      }
    });

    return violations;
  }

  private getConstraintPriority(constraintId: string, geometry: Geometry): number {
    const constraint = geometry.constraints.get(constraintId);
    if (!constraint) return 1.0;

    // Define priority levels for different constraint types
    // Higher values = higher priority
    switch (constraint.type) {
      case "x":
      case "y":
        return 1.5; // Position constraints get higher priority
      case "distance":
      case "x-distance":
      case "y-distance":
        return 1.3; // Distance constraints are important
      case "horizontal":
      case "vertical":
        return 1.2; // Line orientation constraints
      case "same-x":
      case "same-y":
        return 1.1; // Alignment constraints
      case "angle":
        return 1.0; // Angle constraints get base priority
      case "parallel":
      case "perpendicular":
        return 0.9; // Relationship constraints
      case "radius":
        return 0.8; // Shape constraints
      default:
        return 1.0;
    }
  }

  private aggregateGradients(
    violations: ConstraintViolation[]
  ): Map<string, { x: number; y: number }> {
    const aggregated = new Map<string, { x: number; y: number }>();

    // If only one or few constraints, use simple aggregation
    if (violations.length <= 2) {
      violations.forEach((violation) => {
        violation.gradient.forEach((gradient, pointId) => {
          if (!aggregated.has(pointId)) {
            aggregated.set(pointId, { x: 0, y: 0 });
          }
          const current = aggregated.get(pointId)!;
          current.x += gradient.x;
          current.y += gradient.y;
        });
      });
      return aggregated;
    }

    // For multiple constraints, check if normalization is needed
    const violationData = violations.map((violation) => {
      let maxGradMagnitude = 0;
      violation.gradient.forEach((gradient) => {
        const magnitude = Math.sqrt(gradient.x * gradient.x + gradient.y * gradient.y);
        maxGradMagnitude = Math.max(maxGradMagnitude, magnitude);
      });

      return {
        violation,
        maxGradMagnitude: maxGradMagnitude || 1,
        errorMagnitude: Math.sqrt(violation.error),
      };
    });

    // Check if there's a significant magnitude difference (>50x)
    const maxGradMag = Math.max(...violationData.map(v => v.maxGradMagnitude));
    const minGradMag = Math.min(...violationData.map(v => v.maxGradMagnitude));
    const needsNormalization = maxGradMag / minGradMag > 50;

    if (!needsNormalization) {
      // Use simple aggregation if gradients are reasonably balanced
      violations.forEach((violation) => {
        violation.gradient.forEach((gradient, pointId) => {
          if (!aggregated.has(pointId)) {
            aggregated.set(pointId, { x: 0, y: 0 });
          }
          const current = aggregated.get(pointId)!;
          current.x += gradient.x;
          current.y += gradient.y;
        });
      });
      return aggregated;
    }

    // Apply smart normalization only when needed
    const maxErrorMagnitude = Math.max(...violationData.map(v => v.errorMagnitude), 1);

    violations.forEach((violation, index) => {
      const { maxGradMagnitude, errorMagnitude } = violationData[index];
      
      // Get constraint priority for gradient conflicts
      const geometry = this.getCurrentGeometry();
      const priority = geometry ? this.getConstraintPriority(violation.constraintId, geometry) : 1.0;
      
      // Conservative normalization: only scale down very large gradients
      const normalizationFactor = maxGradMagnitude > 100 ? 
        Math.min(1.0, 50.0 / maxGradMagnitude) : 1.0;
      const errorWeight = Math.min(1.0, errorMagnitude / maxErrorMagnitude);
      const priorityWeight = priority;
      const finalScale = normalizationFactor * errorWeight * priorityWeight;

      violation.gradient.forEach((gradient, pointId) => {
        if (!aggregated.has(pointId)) {
          aggregated.set(pointId, { x: 0, y: 0 });
        }

        const current = aggregated.get(pointId)!;
        current.x += gradient.x * finalScale;
        current.y += gradient.y * finalScale;
      });
    });

    return aggregated;
  }

  // Helper to access current geometry during solving
  private currentGeometry: Geometry | null = null;

  private getCurrentGeometry(): Geometry | null {
    return this.currentGeometry;
  }

  private calculateTotalError(geometry: Geometry): number {
    let totalError = 0;

    geometry.constraints.forEach((constraint) => {
      const violation = this.evaluator.evaluate(constraint, geometry);
      totalError += violation.error;
    });

    return totalError;
  }

  private cloneGeometry(geometry: Geometry): Geometry {
    return {
      points: new Map(
        Array.from(geometry.points.entries()).map(([id, point]) => [
          id,
          { ...point },
        ])
      ),
      lines: new Map(geometry.lines),
      circles: new Map(geometry.circles),
      constraints: new Map(geometry.constraints),
      metadata: { ...geometry.metadata },
    };
  }

  reset(): void {
    this.velocity.clear();
  }
}
