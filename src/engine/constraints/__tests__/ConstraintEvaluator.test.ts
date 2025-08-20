import { describe, it, expect, beforeEach } from 'vitest';
import { ConstraintEvaluator } from '../ConstraintEvaluator';
import { createEmptyDocument, createPoint, createLine, createConstraint } from '../../models/document';
import { GeometryDocument } from '../../models/types';

describe('ConstraintEvaluator', () => {
  let evaluator: ConstraintEvaluator;
  let document: GeometryDocument;

  beforeEach(() => {
    evaluator = new ConstraintEvaluator();
    document = createEmptyDocument();
  });

  describe('Distance Constraints', () => {
    it('should evaluate distance constraint with zero error when satisfied', () => {
      // Create two points 5 units apart
      const p1 = createPoint(0, 0);
      const p2 = createPoint(3, 4); // 3-4-5 triangle, distance = 5
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const constraint = createConstraint('distance', [p1.id, p2.id], 5);
      const result = evaluator.evaluate(constraint, document);

      expect(result.constraintId).toBe(constraint.id);
      expect(result.error).toBeCloseTo(0, 10);
    });

    it('should evaluate distance constraint with positive error when not satisfied', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(3, 4); // actual distance = 5
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const constraint = createConstraint('distance', [p1.id, p2.id], 10); // target = 10
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(25); // (5-10)² = 25
    });

    it('should compute correct gradients for distance constraint', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(3, 4); // distance = 5
      
      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const constraint = createConstraint('distance', [p1.id, p2.id], 3); // target shorter
      const result = evaluator.evaluate(constraint, document);

      expect(result.gradient.has(p1.id)).toBe(true);
      expect(result.gradient.has(p2.id)).toBe(true);

      const grad1 = result.gradient.get(p1.id)!;
      const grad2 = result.gradient.get(p2.id)!;

      // Current distance (5) > target (3), so points should move towards each other
      // grad = factor * (point1 - point2) where factor = 2 * (current - target) / current
      // factor = 2 * (5-3) / 5 = 0.8
      // grad1 = 0.8 * (0-3, 0-4) = (-2.4, -3.2) - pointing towards p2
      // grad2 = 0.8 * (3-0, 4-0) = (2.4, 3.2) - pointing away from p1
      expect(grad1.x).toBeCloseTo(-2.4, 5);
      expect(grad1.y).toBeCloseTo(-3.2, 5);
      expect(grad2.x).toBeCloseTo(2.4, 5);
      expect(grad2.y).toBeCloseTo(3.2, 5);
    });

  });

  describe('Fix Constraints', () => {
    it('should evaluate fix-x constraint with zero error when satisfied', () => {
      const point = createPoint(5, 10);
      document.points.set(point.id, point);

      const constraint = createConstraint('fix-x', [point.id], 5);
      const result = evaluator.evaluate(constraint, document);

      expect(result.constraintId).toBe(constraint.id);
      expect(result.error).toBeCloseTo(0, 10);
    });

    it('should evaluate fix-x constraint with positive error when not satisfied', () => {
      const point = createPoint(8, 10); // x should be 5
      document.points.set(point.id, point);

      const constraint = createConstraint('fix-x', [point.id], 5);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(9); // (8-5)² = 9
    });

    it('should compute correct gradients for fix-x constraint', () => {
      const point = createPoint(8, 10);
      document.points.set(point.id, point);

      const constraint = createConstraint('fix-x', [point.id], 5);
      const result = evaluator.evaluate(constraint, document);

      expect(result.gradient.has(point.id)).toBe(true);
      const grad = result.gradient.get(point.id)!;

      // Gradient should only affect x coordinate
      expect(grad.x).toBe(6); // 2 * (8-5) = 6
      expect(grad.y).toBe(0);
    });

    it('should evaluate fix-y constraint with zero error when satisfied', () => {
      const point = createPoint(5, 10);
      document.points.set(point.id, point);

      const constraint = createConstraint('fix-y', [point.id], 10);
      const result = evaluator.evaluate(constraint, document);

      expect(result.constraintId).toBe(constraint.id);
      expect(result.error).toBeCloseTo(0, 10);
    });

    it('should evaluate fix-y constraint with positive error when not satisfied', () => {
      const point = createPoint(5, 13); // y should be 10
      document.points.set(point.id, point);

      const constraint = createConstraint('fix-y', [point.id], 10);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(9); // (13-10)² = 9
    });

    it('should compute correct gradients for fix-y constraint', () => {
      const point = createPoint(5, 13);
      document.points.set(point.id, point);

      const constraint = createConstraint('fix-y', [point.id], 10);
      const result = evaluator.evaluate(constraint, document);

      expect(result.gradient.has(point.id)).toBe(true);
      const grad = result.gradient.get(point.id)!;

      // Gradient should only affect y coordinate
      expect(grad.x).toBe(0);
      expect(grad.y).toBe(6); // 2 * (13-10) = 6
    });
  });

  describe('Parallel Constraints', () => {
    it('should evaluate parallel constraint with zero error when lines are parallel', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(2, 0);
      const p3 = createPoint(0, 1);
      const p4 = createPoint(2, 1);

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);
      document.points.set(p4.id, p4);

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p3.id, p4.id);

      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);

      const constraint = createConstraint('parallel', [line1.id, line2.id]);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBeCloseTo(0, 5); // Should be very close to 0
    });

    it('should evaluate parallel constraint with positive error when not parallel', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(2, 0); // horizontal line
      const p3 = createPoint(0, 0);
      const p4 = createPoint(0, 2); // vertical line

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);
      document.points.set(p4.id, p4);

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p3.id, p4.id);

      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);

      const constraint = createConstraint('parallel', [line1.id, line2.id]);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBeGreaterThan(0); // Perpendicular lines should have max error
    });
  });

  describe('Perpendicular Constraints', () => {
    it('should evaluate perpendicular constraint with zero error when lines are perpendicular', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(2, 0); // horizontal
      const p3 = createPoint(0, 0);
      const p4 = createPoint(0, 2); // vertical

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);
      document.points.set(p4.id, p4);

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p3.id, p4.id);

      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);

      const constraint = createConstraint('perpendicular', [line1.id, line2.id]);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBeCloseTo(0, 10);
    });

    it('should evaluate perpendicular constraint with positive error when parallel', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(2, 0);
      const p3 = createPoint(0, 1);
      const p4 = createPoint(2, 1);

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);
      document.points.set(p4.id, p4);

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p3.id, p4.id);

      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);

      const constraint = createConstraint('perpendicular', [line1.id, line2.id]);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBeGreaterThan(0.5); // Parallel lines should have high error for perpendicular constraint
    });
  });

  describe('Horizontal Constraints', () => {
    it('should evaluate horizontal constraint with zero error for horizontal line', () => {
      const p1 = createPoint(0, 5);
      const p2 = createPoint(10, 5); // same y-coordinate

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      document.lines.set(line.id, line);

      const constraint = createConstraint('horizontal', [line.id]);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(0);
    });

    it('should evaluate horizontal constraint with positive error for non-horizontal line', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(10, 5); // sloped line

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      document.lines.set(line.id, line);

      const constraint = createConstraint('horizontal', [line.id]);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(25); // (5-0)² = 25
    });

    it('should compute correct gradients for horizontal constraint', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(5, 3); // y-difference = 3

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      document.lines.set(line.id, line);

      const constraint = createConstraint('horizontal', [line.id]);
      const result = evaluator.evaluate(constraint, document);

      const grad1 = result.gradient.get(p1.id)!;
      const grad2 = result.gradient.get(p2.id)!;

      // Gradients should only affect y-coordinates
      expect(grad1.x).toBe(0);
      expect(grad2.x).toBe(0);
      
      // y-gradients should oppose each other
      expect(grad1.y).toBeLessThan(0); // p1.y should decrease
      expect(grad2.y).toBeGreaterThan(0); // p2.y should increase
      expect(Math.abs(grad1.y)).toBe(Math.abs(grad2.y)); // equal magnitude
    });
  });

  describe('Vertical Constraints', () => {
    it('should evaluate vertical constraint with zero error for vertical line', () => {
      const p1 = createPoint(5, 0);
      const p2 = createPoint(5, 10); // same x-coordinate

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      document.lines.set(line.id, line);

      const constraint = createConstraint('vertical', [line.id]);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(0);
    });

    it('should compute correct gradients for vertical constraint', () => {
      const p1 = createPoint(0, 0);
      const p2 = createPoint(4, 5); // x-difference = 4

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);

      const line = createLine(p1.id, p2.id);
      document.lines.set(line.id, line);

      const constraint = createConstraint('vertical', [line.id]);
      const result = evaluator.evaluate(constraint, document);

      const grad1 = result.gradient.get(p1.id)!;
      const grad2 = result.gradient.get(p2.id)!;

      // Gradients should only affect x-coordinates
      expect(grad1.y).toBe(0);
      expect(grad2.y).toBe(0);
      
      // x-gradients should oppose each other
      expect(grad1.x).toBeLessThan(0); // p1.x should decrease
      expect(grad2.x).toBeGreaterThan(0); // p2.x should increase
      expect(Math.abs(grad1.x)).toBe(Math.abs(grad2.x)); // equal magnitude
    });
  });

  describe('Error Handling', () => {
    it('should return zero error for constraint with missing entities', () => {
      const constraint = createConstraint('distance', ['non-existent-1', 'non-existent-2'], 10);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(0);
      expect(result.gradient.size).toBe(0);
    });

    it('should handle constraint with wrong number of entities', () => {
      const constraint = createConstraint('distance', ['single-entity'], 10);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(0);
      expect(result.gradient.size).toBe(0);
    });

    it('should handle unsupported constraint types gracefully', () => {
      const constraint = createConstraint('tangent' as any, ['entity1', 'entity2']);
      const result = evaluator.evaluate(constraint, document);

      expect(result.error).toBe(0);
      expect(result.gradient.size).toBe(0);
    });
  });
});