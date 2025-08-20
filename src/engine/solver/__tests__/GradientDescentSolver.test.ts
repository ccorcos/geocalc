import { describe, it, expect, beforeEach } from 'vitest';
import { GradientDescentSolver } from '../GradientDescentSolver';
import { createEmptyDocument, createPoint, createLine, createConstraint } from '../../models/document';
import { GeometryDocument } from '../../models/types';
import { distance } from '../../../utils/math';

describe('GradientDescentSolver', () => {
  let solver: GradientDescentSolver;
  let document: GeometryDocument;

  beforeEach(() => {
    solver = new GradientDescentSolver();
    document = createEmptyDocument();
  });

  describe('Basic Solving', () => {
    it('should solve simple distance constraint', () => {
      // Create two points that are 5 units apart
      const p1 = createPoint(0, 0, true); // fixed point
      const p2 = createPoint(3, 4); // movable, currently at distance 5
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      // Add constraint to make distance 10
      const constraint = createConstraint('distance', [p1.id, p2.id], 10);
      document.constraints.set(constraint.id, constraint);

      const result = solver.solve(document);

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-6);

      // Point 1 should remain fixed
      const solvedP1 = result.document.points.get(p1.id)!;
      expect(solvedP1.x).toBe(0);
      expect(solvedP1.y).toBe(0);

      // Point 2 should be moved to distance 10 from p1
      const solvedP2 = result.document.points.get(p2.id)!;
      const actualDistance = distance(solvedP1, solvedP2);
      expect(actualDistance).toBeCloseTo(10, 3);
    });

    it('should return original document when no constraints exist', () => {
      const p1 = createPoint(1, 2);
      const p2 = createPoint(3, 4);
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const result = solver.solve(document);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(0);
      expect(result.finalError).toBe(0);

      // Points should remain unchanged
      expect(result.document.points.get(p1.id)!.x).toBe(1);
      expect(result.document.points.get(p1.id)!.y).toBe(2);
      expect(result.document.points.get(p2.id)!.x).toBe(3);
      expect(result.document.points.get(p2.id)!.y).toBe(4);
    });

    it('should handle multiple distance constraints', () => {
      // Create triangle with specific side lengths
      const p1 = createPoint(0, 0, true); // fixed
      const p2 = createPoint(10, 0); // movable
      const p3 = createPoint(5, 5); // movable

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);

      // Create constraints for equilateral triangle with side length 6
      const c1 = createConstraint('distance', [p1.id, p2.id], 6);
      const c2 = createConstraint('distance', [p2.id, p3.id], 6);
      const c3 = createConstraint('distance', [p3.id, p1.id], 6);

      document.constraints.set(c1.id, c1);
      document.constraints.set(c2.id, c2);
      document.constraints.set(c3.id, c3);

      const result = solver.solve(document, {
        maxIterations: 500,
        tolerance: 1e-8,
        learningRate: 0.01,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-3);

      // Verify all distances are approximately 6
      const solvedP1 = result.document.points.get(p1.id)!;
      const solvedP2 = result.document.points.get(p2.id)!;
      const solvedP3 = result.document.points.get(p3.id)!;

      expect(distance(solvedP1, solvedP2)).toBeCloseTo(6, 2);
      expect(distance(solvedP2, solvedP3)).toBeCloseTo(6, 2);
      expect(distance(solvedP3, solvedP1)).toBeCloseTo(6, 2);
    });
  });

  describe('Horizontal and Vertical Constraints', () => {
    it('should solve horizontal line constraint', () => {
      const p1 = createPoint(0, 5);
      const p2 = createPoint(10, 8); // not horizontal

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      document.lines.set(line.id, line);

      const constraint = createConstraint('horizontal', [line.id]);
      document.constraints.set(constraint.id, constraint);

      const result = solver.solve(document);

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-6);

      // Both points should have same y-coordinate
      const solvedP1 = result.document.points.get(p1.id)!;
      const solvedP2 = result.document.points.get(p2.id)!;

      expect(Math.abs(solvedP1.y - solvedP2.y)).toBeLessThan(1e-3);
    });

    it('should solve vertical line constraint', () => {
      const p1 = createPoint(5, 0);
      const p2 = createPoint(8, 10); // not vertical

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      document.lines.set(line.id, line);

      const constraint = createConstraint('vertical', [line.id]);
      document.constraints.set(constraint.id, constraint);

      const result = solver.solve(document);

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-6);

      // Both points should have same x-coordinate
      const solvedP1 = result.document.points.get(p1.id)!;
      const solvedP2 = result.document.points.get(p2.id)!;

      expect(Math.abs(solvedP1.x - solvedP2.x)).toBeLessThan(1e-3);
    });
  });

  describe('Parallel and Perpendicular Constraints', () => {
    it('should solve parallel lines constraint', () => {
      // Create two non-parallel lines
      const p1 = createPoint(0, 0, true);
      const p2 = createPoint(2, 0, true);
      const p3 = createPoint(0, 2);
      const p4 = createPoint(1, 3);

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);
      document.points.set(p4.id, p4);

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p3.id, p4.id);
      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);

      const constraint = createConstraint('parallel', [line1.id, line2.id]);
      document.constraints.set(constraint.id, constraint);

      const result = solver.solve(document, {
        maxIterations: 200,
        tolerance: 1e-8,
        learningRate: 0.005,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-4);

      // Lines should be parallel (horizontal in this case)
      const solvedP3 = result.document.points.get(p3.id)!;
      const solvedP4 = result.document.points.get(p4.id)!;

      // Since line1 is horizontal, line2 should also be horizontal
      expect(Math.abs(solvedP3.y - solvedP4.y)).toBeLessThan(0.1);
    });

    it('should solve perpendicular lines constraint', () => {
      const p1 = createPoint(0, 0, true);
      const p2 = createPoint(2, 0, true); // horizontal line
      const p3 = createPoint(1, 1);
      const p4 = createPoint(2, 2); // diagonal line

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);
      document.points.set(p4.id, p4);

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p3.id, p4.id);
      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);

      const constraint = createConstraint('perpendicular', [line1.id, line2.id]);
      document.constraints.set(constraint.id, constraint);

      const result = solver.solve(document, {
        maxIterations: 200,
        tolerance: 1e-6,
        learningRate: 0.01,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-4);

      // Line2 should be vertical (perpendicular to horizontal line1)
      const solvedP3 = result.document.points.get(p3.id)!;
      const solvedP4 = result.document.points.get(p4.id)!;

      expect(Math.abs(solvedP3.x - solvedP4.x)).toBeLessThan(0.1);
    });
  });

  describe('Complex Constraint Systems', () => {
    it('should solve system with mixed constraint types', () => {
      // Create a right-angled triangle with specific dimensions
      const p1 = createPoint(0, 0, true); // origin, fixed
      const p2 = createPoint(5, 0); // on x-axis
      const p3 = createPoint(0, 3); // on y-axis

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);

      const line1 = createLine(p1.id, p2.id); // base
      const line2 = createLine(p1.id, p3.id); // height
      const line3 = createLine(p2.id, p3.id); // hypotenuse

      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);
      document.lines.set(line3.id, line3);

      // Constraints
      const horizontalConstraint = createConstraint('horizontal', [line1.id]);
      const verticalConstraint = createConstraint('vertical', [line2.id]);
      const baseLength = createConstraint('distance', [p1.id, p2.id], 4);
      const heightLength = createConstraint('distance', [p1.id, p3.id], 3);

      document.constraints.set(horizontalConstraint.id, horizontalConstraint);
      document.constraints.set(verticalConstraint.id, verticalConstraint);
      document.constraints.set(baseLength.id, baseLength);
      document.constraints.set(heightLength.id, heightLength);

      const result = solver.solve(document, {
        maxIterations: 300,
        tolerance: 1e-8,
        learningRate: 0.01,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-6);

      // Verify final configuration
      const solvedP1 = result.document.points.get(p1.id)!;
      const solvedP2 = result.document.points.get(p2.id)!;
      const solvedP3 = result.document.points.get(p3.id)!;

      expect(distance(solvedP1, solvedP2)).toBeCloseTo(4, 4);
      expect(distance(solvedP1, solvedP3)).toBeCloseTo(3, 4);
      
      // Should form right angle
      expect(Math.abs(solvedP2.y - solvedP1.y)).toBeLessThan(1e-4); // horizontal
      expect(Math.abs(solvedP3.x - solvedP1.x)).toBeLessThan(1e-4); // vertical

      // Hypotenuse should be 5 (3-4-5 triangle)
      expect(distance(solvedP2, solvedP3)).toBeCloseTo(5, 4);
    });
  });

  describe('Solver Configuration', () => {
    it('should respect maxIterations limit', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(100, 100);
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const constraint = createConstraint('distance', [p1.id, p2.id], 1);
      document.constraints.set(constraint.id, constraint);

      const result = solver.solve(document, {
        maxIterations: 5, // very limited
        tolerance: 1e-10,
        learningRate: 0.001, // very slow
        momentum: 0
      });

      expect(result.iterations).toBeLessThanOrEqual(5);
      expect(result.success).toBe(false); // probably won't converge in 5 iterations
    });

    it('should respect tolerance setting', () => {
      const p1 = createPoint(0, 0, true);
      const p2 = createPoint(3, 4);
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const constraint = createConstraint('distance', [p1.id, p2.id], 5.1); // close to current
      document.constraints.set(constraint.id, constraint);

      const result = solver.solve(document, {
        maxIterations: 100,
        tolerance: 0.1, // loose tolerance
        learningRate: 0.01,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(0.1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle overconstrained systems gracefully', () => {
      // Two conflicting distance constraints
      const p1 = createPoint(0, 0, true);
      const p2 = createPoint(3, 4);
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const constraint1 = createConstraint('distance', [p1.id, p2.id], 5);
      const constraint2 = createConstraint('distance', [p1.id, p2.id], 10); // conflicting

      document.constraints.set(constraint1.id, constraint1);
      document.constraints.set(constraint2.id, constraint2);

      const result = solver.solve(document);

      // Should reach some compromise solution
      expect(result.iterations).toBeGreaterThan(0);
      // May not fully succeed due to conflicting constraints
    });

    it('should handle degenerate cases', () => {
      // Two coincident points
      const p1 = createPoint(5, 5);
      const p2 = createPoint(5, 5);
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const constraint = createConstraint('distance', [p1.id, p2.id], 3);
      document.constraints.set(constraint.id, constraint);

      const result = solver.solve(document);

      // Should move points apart
      expect(result.success).toBe(true);
      const finalDistance = distance(
        result.document.points.get(p1.id)!,
        result.document.points.get(p2.id)!
      );
      expect(finalDistance).toBeCloseTo(3, 3);
    });
  });

  describe('Solver State Management', () => {
    it('should reset velocity between different solve calls', () => {
      const p1 = createPoint(0, 0, true);
      const p2 = createPoint(1, 1);
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const constraint = createConstraint('distance', [p1.id, p2.id], 5);
      document.constraints.set(constraint.id, constraint);

      // First solve
      const result1 = solver.solve(document);
      expect(result1.success).toBe(true);

      // Modify the document and solve again
      const modifiedDoc = result1.document;
      const newP2 = modifiedDoc.points.get(p2.id)!;
      newP2.x = 10;
      newP2.y = 10;

      solver.reset(); // Explicit reset
      const result2 = solver.solve(modifiedDoc);
      expect(result2.success).toBe(true);

      // Should converge to correct distance again
      const finalDistance = distance(
        result2.document.points.get(p1.id)!,
        result2.document.points.get(p2.id)!
      );
      expect(finalDistance).toBeCloseTo(5, 3);
    });
  });
});