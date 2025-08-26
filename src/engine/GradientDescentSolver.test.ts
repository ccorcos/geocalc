import { beforeEach, describe, expect, it } from "vitest";
import { distance } from "../math";
import {
  createConstraint,
  createEmptyGeometry,
  createLine,
  createPoint,
} from "./geometry";
import { Geometry } from "./types";
import { GradientDescentSolver } from "./GradientDescentSolver";

describe("GradientDescentSolver", () => {
  let solver: GradientDescentSolver;
  let geometry: Geometry;

  beforeEach(() => {
    solver = new GradientDescentSolver();
    geometry = createEmptyGeometry();
  });

  describe("Basic Solving", () => {
    it("should solve simple distance constraint", () => {
      // Create two points that are 5 units apart
      const p1 = createPoint(0, 0); // fixed point
      const p2 = createPoint(3, 4); // movable, currently at distance 5

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      // Fix p1 at origin
      const fixXConstraint = createConstraint("x", [p1.id], 0);
      const fixYConstraint = createConstraint("y", [p1.id], 0);
      geometry.constraints.set(fixXConstraint.id, fixXConstraint);
      geometry.constraints.set(fixYConstraint.id, fixYConstraint);

      // Add constraint to make distance 10
      const constraint = createConstraint("distance", [p1.id, p2.id], 10);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry);

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-6);

      // Point 1 should remain fixed
      const solvedP1 = result.geometry.points.get(p1.id)!;
      expect(solvedP1.x).toBeCloseTo(0, 3);
      expect(solvedP1.y).toBeCloseTo(0, 3);

      // Point 2 should be moved to distance 10 from p1
      const solvedP2 = result.geometry.points.get(p2.id)!;
      const actualDistance = distance(solvedP1, solvedP2);
      expect(actualDistance).toBeCloseTo(10, 3);
    });

    it("should return original geometry when no constraints exist", () => {
      const p1 = createPoint(1, 2);
      const p2 = createPoint(3, 4);

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      const result = solver.solve(geometry);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(0);
      expect(result.finalError).toBe(0);

      // Points should remain unchanged
      expect(result.geometry.points.get(p1.id)!.x).toBe(1);
      expect(result.geometry.points.get(p1.id)!.y).toBe(2);
      expect(result.geometry.points.get(p2.id)!.x).toBe(3);
      expect(result.geometry.points.get(p2.id)!.y).toBe(4);
    });

    it("should handle multiple distance constraints", () => {
      // Create triangle with specific side lengths
      const p1 = createPoint(0, 0); // fixed
      const p2 = createPoint(10, 0); // movable
      const p3 = createPoint(5, 5); // movable

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);
      geometry.points.set(p3.id, p3);

      // Create constraints for equilateral triangle with side length 6
      const c1 = createConstraint("distance", [p1.id, p2.id], 6);
      const c2 = createConstraint("distance", [p2.id, p3.id], 6);
      const c3 = createConstraint("distance", [p3.id, p1.id], 6);

      geometry.constraints.set(c1.id, c1);
      geometry.constraints.set(c2.id, c2);
      geometry.constraints.set(c3.id, c3);

      const result = solver.solve(geometry, {
        maxIterations: 500,
        tolerance: 1e-8,
        learningRate: 0.01,
        momentum: 0.9,
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-3);

      // Verify all distances are approximately 6
      const solvedP1 = result.geometry.points.get(p1.id)!;
      const solvedP2 = result.geometry.points.get(p2.id)!;
      const solvedP3 = result.geometry.points.get(p3.id)!;

      expect(distance(solvedP1, solvedP2)).toBeCloseTo(6, 2);
      expect(distance(solvedP2, solvedP3)).toBeCloseTo(6, 2);
      expect(distance(solvedP3, solvedP1)).toBeCloseTo(6, 2);
    });
  });

  describe("Horizontal and Vertical Constraints", () => {
    it("should solve horizontal line constraint", () => {
      const p1 = createPoint(0, 5);
      const p2 = createPoint(10, 8); // not horizontal

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      geometry.lines.set(line.id, line);

      const constraint = createConstraint("horizontal", [line.id]);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry);

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-6);

      // Both points should have same y-coordinate
      const solvedP1 = result.geometry.points.get(p1.id)!;
      const solvedP2 = result.geometry.points.get(p2.id)!;

      expect(Math.abs(solvedP1.y - solvedP2.y)).toBeLessThan(1e-3);
    });

    it("should solve vertical line constraint", () => {
      const p1 = createPoint(5, 0);
      const p2 = createPoint(8, 10); // not vertical

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      geometry.lines.set(line.id, line);

      const constraint = createConstraint("vertical", [line.id]);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry);

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-6);

      // Both points should have same x-coordinate
      const solvedP1 = result.geometry.points.get(p1.id)!;
      const solvedP2 = result.geometry.points.get(p2.id)!;

      expect(Math.abs(solvedP1.x - solvedP2.x)).toBeLessThan(1e-3);
    });
  });

  describe("Parallel and Perpendicular Constraints", () => {
    it("should solve parallel lines constraint", () => {
      // Create two non-parallel lines
      const p1 = createPoint(0, 0);
      const p2 = createPoint(2, 0);
      const p3 = createPoint(0, 2);
      const p4 = createPoint(1, 3);

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);
      geometry.points.set(p3.id, p3);
      geometry.points.set(p4.id, p4);

      // Fix only p1 to provide a minimal anchor point
      const fixP1X = createConstraint("x", [p1.id], 0);
      const fixP1Y = createConstraint("y", [p1.id], 0);
      geometry.constraints.set(fixP1X.id, fixP1X);
      geometry.constraints.set(fixP1Y.id, fixP1Y);

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p3.id, p4.id);
      geometry.lines.set(line1.id, line1);
      geometry.lines.set(line2.id, line2);

      const constraint = createConstraint("parallel", [line1.id, line2.id]);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry, {
        maxIterations: 500,
        tolerance: 1e-6,
        learningRate: 0.01,
        momentum: 0.8,
      });


      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-3);

      // Lines should be parallel (horizontal in this case)
      const solvedP3 = result.geometry.points.get(p3.id)!;
      const solvedP4 = result.geometry.points.get(p4.id)!;

      // Since line1 is horizontal, line2 should also be horizontal (within tolerance)
      expect(Math.abs(solvedP3.y - solvedP4.y)).toBeLessThan(0.5);
    });

    it("should solve perpendicular lines constraint", () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(2, 0); // horizontal line
      const p3 = createPoint(1, 1);
      const p4 = createPoint(2, 2); // diagonal line

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);
      geometry.points.set(p3.id, p3);
      geometry.points.set(p4.id, p4);

      // Fix line1 to provide anchor points
      const fixP1X = createConstraint("x", [p1.id], 0);
      const fixP1Y = createConstraint("y", [p1.id], 0);
      const fixP2X = createConstraint("x", [p2.id], 2);
      const fixP2Y = createConstraint("y", [p2.id], 0);
      // Fix one endpoint of line2 to prevent drift
      const fixP3X = createConstraint("x", [p3.id], 1);
      const fixP3Y = createConstraint("y", [p3.id], 1);
      geometry.constraints.set(fixP1X.id, fixP1X);
      geometry.constraints.set(fixP1Y.id, fixP1Y);
      geometry.constraints.set(fixP2X.id, fixP2X);
      geometry.constraints.set(fixP2Y.id, fixP2Y);
      geometry.constraints.set(fixP3X.id, fixP3X);
      geometry.constraints.set(fixP3Y.id, fixP3Y);

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p3.id, p4.id);
      geometry.lines.set(line1.id, line1);
      geometry.lines.set(line2.id, line2);

      const constraint = createConstraint("perpendicular", [
        line1.id,
        line2.id,
      ]);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry, {
        maxIterations: 200,
        tolerance: 1e-6,
        learningRate: 0.01,
        momentum: 0.9,
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-4);

      // Line2 should be vertical (perpendicular to horizontal line1)
      const solvedP3 = result.geometry.points.get(p3.id)!;
      const solvedP4 = result.geometry.points.get(p4.id)!;

      expect(Math.abs(solvedP3.x - solvedP4.x)).toBeLessThan(0.1);
    });
  });

  describe("Complex Constraint Systems", () => {
    it("should solve system with mixed constraint types", () => {
      // Create a right-angled triangle with specific dimensions
      const p1 = createPoint(0, 0); // origin, fixed
      const p2 = createPoint(5, 0); // on x-axis
      const p3 = createPoint(0, 3); // on y-axis

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);
      geometry.points.set(p3.id, p3);

      // Fix p1 at origin to provide anchor point
      const fixP1X = createConstraint("x", [p1.id], 0);
      const fixP1Y = createConstraint("y", [p1.id], 0);
      geometry.constraints.set(fixP1X.id, fixP1X);
      geometry.constraints.set(fixP1Y.id, fixP1Y);

      const line1 = createLine(p1.id, p2.id); // base
      const line2 = createLine(p1.id, p3.id); // height
      const line3 = createLine(p2.id, p3.id); // hypotenuse

      geometry.lines.set(line1.id, line1);
      geometry.lines.set(line2.id, line2);
      geometry.lines.set(line3.id, line3);

      // Constraints
      const horizontalConstraint = createConstraint("horizontal", [line1.id]);
      const verticalConstraint = createConstraint("vertical", [line2.id]);
      const baseLength = createConstraint("distance", [p1.id, p2.id], 4);
      const heightLength = createConstraint("distance", [p1.id, p3.id], 3);

      geometry.constraints.set(horizontalConstraint.id, horizontalConstraint);
      geometry.constraints.set(verticalConstraint.id, verticalConstraint);
      geometry.constraints.set(baseLength.id, baseLength);
      geometry.constraints.set(heightLength.id, heightLength);

      const result = solver.solve(geometry, {
        maxIterations: 300,
        tolerance: 1e-8,
        learningRate: 0.01,
        momentum: 0.9,
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-6);

      // Verify final configuration
      const solvedP1 = result.geometry.points.get(p1.id)!;
      const solvedP2 = result.geometry.points.get(p2.id)!;
      const solvedP3 = result.geometry.points.get(p3.id)!;

      expect(distance(solvedP1, solvedP2)).toBeCloseTo(4, 3);
      expect(distance(solvedP1, solvedP3)).toBeCloseTo(3, 3);

      // Should form right angle
      expect(Math.abs(solvedP2.y - solvedP1.y)).toBeLessThan(1e-3); // horizontal
      expect(Math.abs(solvedP3.x - solvedP1.x)).toBeLessThan(1e-3); // vertical

      // Hypotenuse should be 5 (3-4-5 triangle)
      expect(distance(solvedP2, solvedP3)).toBeCloseTo(5, 3);
    });

    it("should solve same-x constraint", () => {
      const p1 = createPoint(2, 5);
      const p2 = createPoint(8, 10); // different x coordinates

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      // Fix p1 to provide anchor
      const fixP1X = createConstraint("x", [p1.id], 2);
      const fixP1Y = createConstraint("y", [p1.id], 5);
      geometry.constraints.set(fixP1X.id, fixP1X);
      geometry.constraints.set(fixP1Y.id, fixP1Y);

      const constraint = createConstraint("same-x", [p1.id, p2.id]);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry);
      expect(result.success).toBe(true);

      const solvedP1 = result.geometry.points.get(p1.id)!;
      const solvedP2 = result.geometry.points.get(p2.id)!;

      // Points should have same x coordinate
      expect(Math.abs(solvedP1.x - solvedP2.x)).toBeLessThan(0.01);
      // P1 should remain fixed
      expect(solvedP1.x).toBeCloseTo(2, 3);
      expect(solvedP1.y).toBeCloseTo(5, 3);
      // P2 should move to match P1's x coordinate
      expect(solvedP2.x).toBeCloseTo(2, 3);
    });

    it("should solve same-y constraint", () => {
      const p1 = createPoint(5, 3);
      const p2 = createPoint(10, 9); // different y coordinates

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      // Fix p1 to provide anchor
      const fixP1X = createConstraint("x", [p1.id], 5);
      const fixP1Y = createConstraint("y", [p1.id], 3);
      geometry.constraints.set(fixP1X.id, fixP1X);
      geometry.constraints.set(fixP1Y.id, fixP1Y);

      const constraint = createConstraint("same-y", [p1.id, p2.id]);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry);
      expect(result.success).toBe(true);

      const solvedP1 = result.geometry.points.get(p1.id)!;
      const solvedP2 = result.geometry.points.get(p2.id)!;

      // Points should have same y coordinate
      expect(Math.abs(solvedP1.y - solvedP2.y)).toBeLessThan(0.01);
      // P1 should remain fixed
      expect(solvedP1.x).toBeCloseTo(5, 3);
      expect(solvedP1.y).toBeCloseTo(3, 3);
      // P2 should move to match P1's y coordinate
      expect(solvedP2.y).toBeCloseTo(3, 3);
    });

    it("should solve angle constraint", () => {
      // Create points that don't form the target angle initially
      const p1 = createPoint(1, 1);
      const p2 = createPoint(0, 0); // vertex
      const p3 = createPoint(2, 0);

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);
      geometry.points.set(p3.id, p3);

      // Fix vertex and one arm to provide stability
      const fixP2X = createConstraint("x", [p2.id], 0);
      const fixP2Y = createConstraint("y", [p2.id], 0);
      const fixP3X = createConstraint("x", [p3.id], 2);
      const fixP3Y = createConstraint("y", [p3.id], 0);
      geometry.constraints.set(fixP2X.id, fixP2X);
      geometry.constraints.set(fixP2Y.id, fixP2Y);
      geometry.constraints.set(fixP3X.id, fixP3X);
      geometry.constraints.set(fixP3Y.id, fixP3Y);

      // Constrain angle to 90 degrees
      const angleConstraint = createConstraint(
        "angle",
        [p1.id, p2.id, p3.id],
        90
      );
      geometry.constraints.set(angleConstraint.id, angleConstraint);

      const result = solver.solve(geometry);
      expect(result.success).toBe(true);

      const solvedP1 = result.geometry.points.get(p1.id)!;
      const solvedP2 = result.geometry.points.get(p2.id)!;
      const solvedP3 = result.geometry.points.get(p3.id)!;

      // Calculate the angle between the vectors
      const v1x = solvedP1.x - solvedP2.x;
      const v1y = solvedP1.y - solvedP2.y;
      const v2x = solvedP3.x - solvedP2.x;
      const v2y = solvedP3.y - solvedP2.y;

      const dotProduct = v1x * v2x + v1y * v2y;
      const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

      const cosAngle = dotProduct / (mag1 * mag2);
      const angle =
        Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

      expect(angle).toBeCloseTo(90, 1); // Within 1 degree of 90°
    });
  });

  describe("Solver Configuration", () => {
    it("should respect maxIterations limit", () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(100, 100);

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      const constraint = createConstraint("distance", [p1.id, p2.id], 1);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry, {
        maxIterations: 5, // very limited
        tolerance: 1e-10,
        learningRate: 0.001, // very slow
        momentum: 0,
      });

      expect(result.iterations).toBeLessThanOrEqual(5);
      expect(result.success).toBe(false); // probably won't converge in 5 iterations
    });

    it("should respect tolerance setting", () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(3, 4);

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      const constraint = createConstraint("distance", [p1.id, p2.id], 5.1); // close to current
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry, {
        maxIterations: 100,
        tolerance: 0.1, // loose tolerance
        learningRate: 0.01,
        momentum: 0.9,
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(0.1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle overconstrained systems gracefully", () => {
      // Two conflicting distance constraints
      const p1 = createPoint(0, 0);
      const p2 = createPoint(3, 4);

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      const constraint1 = createConstraint("distance", [p1.id, p2.id], 5);
      const constraint2 = createConstraint("distance", [p1.id, p2.id], 10); // conflicting

      geometry.constraints.set(constraint1.id, constraint1);
      geometry.constraints.set(constraint2.id, constraint2);

      const result = solver.solve(geometry);

      // Should reach some compromise solution
      expect(result.iterations).toBeGreaterThan(0);
      // May not fully succeed due to conflicting constraints
    });

    it("should handle degenerate cases by avoiding them", () => {
      // Two nearly coincident points (0.001 apart) - more realistic than exactly coincident
      const p1 = createPoint(5, 5);
      const p2 = createPoint(5.001, 5.001);

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      // Fix p1 to provide anchor point
      const fixP1X = createConstraint("x", [p1.id], 5);
      const fixP1Y = createConstraint("y", [p1.id], 5);
      geometry.constraints.set(fixP1X.id, fixP1X);
      geometry.constraints.set(fixP1Y.id, fixP1Y);

      const constraint = createConstraint("distance", [p1.id, p2.id], 3);
      geometry.constraints.set(constraint.id, constraint);

      const result = solver.solve(geometry);

      // Should move points apart
      expect(result.success).toBe(true);
      const finalDistance = distance(
        result.geometry.points.get(p1.id)!,
        result.geometry.points.get(p2.id)!
      );
      expect(finalDistance).toBeCloseTo(3, 2);
    });
  });

  describe("Solver State Management", () => {
    it("should reset velocity between different solve calls", () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(1, 1);

      geometry.points.set(p1.id, p1);
      geometry.points.set(p2.id, p2);

      const constraint = createConstraint("distance", [p1.id, p2.id], 5);
      geometry.constraints.set(constraint.id, constraint);

      // First solve
      const result1 = solver.solve(geometry);
      expect(result1.success).toBe(true);

      // Modify the geometry and solve again
      const modifiedDoc = result1.geometry;
      const newP2 = modifiedDoc.points.get(p2.id)!;
      newP2.x = 10;
      newP2.y = 10;

      solver.reset(); // Explicit reset
      const result2 = solver.solve(modifiedDoc);
      expect(result2.success).toBe(true);

      // Should converge to correct distance again
      const finalDistance = distance(
        result2.geometry.points.get(p1.id)!,
        result2.geometry.points.get(p2.id)!
      );
      expect(finalDistance).toBeCloseTo(5, 3);
    });
  });
});
