import { GeometryDocument, Point } from '../models/types';
import { ConstraintEvaluator, ConstraintViolation } from '../constraints/ConstraintEvaluator';

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
  document: GeometryDocument;
}

export class GradientDescentSolver {
  private evaluator = new ConstraintEvaluator();
  private velocity = new Map<string, { x: number; y: number }>();

  solve(
    document: GeometryDocument,
    options: SolverOptions = {
      maxIterations: 200,
      tolerance: 1e-8,
      learningRate: 0.1,
      momentum: 0.8,
    }
  ): SolverResult {
    let currentDocument = this.cloneDocument(document);
    let totalError = this.calculateTotalError(currentDocument);
    
    for (let iteration = 0; iteration < options.maxIterations; iteration++) {
      // Calculate all constraint violations and gradients
      const violations = this.evaluateAllConstraints(currentDocument);
      
      if (violations.length === 0) {
        return {
          success: true,
          iterations: iteration,
          finalError: 0,
          document: currentDocument,
        };
      }

      // Aggregate gradients for each point
      const aggregatedGradients = this.aggregateGradients(violations);
      
      // Update point positions using gradient descent with momentum
      let hasMovement = false;
      aggregatedGradients.forEach((gradient, pointId) => {
        const point = currentDocument.points.get(pointId);
        if (!point) return;

        // Get or initialize velocity for this point
        if (!this.velocity.has(pointId)) {
          this.velocity.set(pointId, { x: 0, y: 0 });
        }
        const velocity = this.velocity.get(pointId)!;

        // Update velocity with momentum
        velocity.x = options.momentum * velocity.x - options.learningRate * gradient.x;
        velocity.y = options.momentum * velocity.y - options.learningRate * gradient.y;

        // Update position
        const newX = point.x + velocity.x;
        const newY = point.y + velocity.y;

        // Check if there's actual movement
        if (Math.abs(newX - point.x) > options.tolerance || 
            Math.abs(newY - point.y) > options.tolerance) {
          hasMovement = true;
        }

        point.x = newX;
        point.y = newY;
      });

      // Calculate new total error
      const newTotalError = this.calculateTotalError(currentDocument);
      
      // Check for convergence
      if (!hasMovement || Math.abs(totalError - newTotalError) < options.tolerance) {
        return {
          success: newTotalError < 0.5, // Success if error is reasonable for complex systems
          iterations: iteration + 1,
          finalError: newTotalError,
          document: currentDocument,
        };
      }

      totalError = newTotalError;
    }

    return {
      success: false,
      iterations: options.maxIterations,
      finalError: totalError,
      document: currentDocument,
    };
  }

  private evaluateAllConstraints(document: GeometryDocument): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    document.constraints.forEach(constraint => {
      const violation = this.evaluator.evaluate(constraint, document);
      if (violation.error > 0) {
        violations.push(violation);
      }
    });

    return violations;
  }

  private aggregateGradients(violations: ConstraintViolation[]): Map<string, { x: number; y: number }> {
    const aggregated = new Map<string, { x: number; y: number }>();

    violations.forEach(violation => {
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

  private calculateTotalError(document: GeometryDocument): number {
    let totalError = 0;
    
    document.constraints.forEach(constraint => {
      const violation = this.evaluator.evaluate(constraint, document);
      totalError += violation.error;
    });

    return totalError;
  }

  private cloneDocument(document: GeometryDocument): GeometryDocument {
    return {
      points: new Map(Array.from(document.points.entries()).map(([id, point]) => [
        id,
        { ...point }
      ])),
      lines: new Map(document.lines),
      circles: new Map(document.circles),
      constraints: new Map(document.constraints),
      metadata: { ...document.metadata },
    };
  }

  reset(): void {
    this.velocity.clear();
  }
}