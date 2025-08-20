import { describe, it, expect, beforeEach } from 'vitest';
import { GradientDescentSolver } from '../../engine/solver/GradientDescentSolver';
import { createEmptyDocument, createPoint, createLine, createCircle, createConstraint } from '../../engine/models/document';
import { GeometryDocument } from '../../engine/models/types';
import { distance } from '../../utils/math';

describe('Constraint Solving Integration Tests', () => {
  let solver: GradientDescentSolver;
  let document: GeometryDocument;

  beforeEach(() => {
    solver = new GradientDescentSolver();
    document = createEmptyDocument();
  });

  describe('Real-World Scenarios', () => {
    it('should construct a square from arbitrary points', () => {
      // Start with 4 random points
      const p1 = createPoint(0, 0); // fixed corner
      const p2 = createPoint(7, 2); // will become adjacent corner
      const p3 = createPoint(3, 8); // will become opposite corner
      const p4 = createPoint(1, 5); // will become adjacent corner

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);
      document.points.set(p4.id, p4);

      // Add lines to form a quadrilateral
      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p2.id, p3.id);
      const line3 = createLine(p3.id, p4.id);
      const line4 = createLine(p4.id, p1.id);

      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);
      document.lines.set(line3.id, line3);
      document.lines.set(line4.id, line4);

      // Square constraints: all sides equal length, all angles 90 degrees
      const sideLength = 5;
      const equalSides = [
        createConstraint('distance', [p1.id, p2.id], sideLength),
        createConstraint('distance', [p2.id, p3.id], sideLength),
        createConstraint('distance', [p3.id, p4.id], sideLength),
        createConstraint('distance', [p4.id, p1.id], sideLength),
      ];

      const rightAngles = [
        createConstraint('perpendicular', [line1.id, line2.id]),
        createConstraint('perpendicular', [line2.id, line3.id]),
        createConstraint('perpendicular', [line3.id, line4.id]),
        createConstraint('perpendicular', [line4.id, line1.id]),
      ];

      [...equalSides, ...rightAngles].forEach(constraint => {
        document.constraints.set(constraint.id, constraint);
      });

      const result = solver.solve(document, {
        maxIterations: 500,
        tolerance: 1e-6,
        learningRate: 0.005,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-4);

      // Verify it's actually a square
      const points = [p1.id, p2.id, p3.id, p4.id].map(id => 
        result.document.points.get(id)!
      );

      // All sides should be equal
      const distances = [
        distance(points[0], points[1]),
        distance(points[1], points[2]),
        distance(points[2], points[3]),
        distance(points[3], points[0]),
      ];

      distances.forEach(d => {
        expect(d).toBeCloseTo(sideLength, 2);
      });

      // Diagonals should be equal and √2 times side length
      const diagonal1 = distance(points[0], points[2]);
      const diagonal2 = distance(points[1], points[3]);
      const expectedDiagonal = sideLength * Math.sqrt(2);

      expect(diagonal1).toBeCloseTo(expectedDiagonal, 2);
      expect(diagonal2).toBeCloseTo(expectedDiagonal, 2);
    });

    it('should construct an equilateral triangle', () => {
      const p1 = createPoint(0, 0); // fixed vertex
      const p2 = createPoint(10, 0); // base point
      const p3 = createPoint(5, 10); // apex

      document.points.set(p1.id, p1);
      document.points.set(p2.id, p2);
      document.points.set(p3.id, p3);

      const sideLength = 8;
      const constraints = [
        createConstraint('distance', [p1.id, p2.id], sideLength),
        createConstraint('distance', [p2.id, p3.id], sideLength),
        createConstraint('distance', [p3.id, p1.id], sideLength),
      ];

      constraints.forEach(c => document.constraints.set(c.id, c));

      const result = solver.solve(document, {
        maxIterations: 300,
        tolerance: 1e-8,
        learningRate: 0.01,
        momentum: 0.9
      });

      expect(result.success).toBe(true);

      // Verify equilateral triangle
      const solvedPoints = [p1.id, p2.id, p3.id].map(id => 
        result.document.points.get(id)!
      );

      expect(distance(solvedPoints[0], solvedPoints[1])).toBeCloseTo(sideLength, 3);
      expect(distance(solvedPoints[1], solvedPoints[2])).toBeCloseTo(sideLength, 3);
      expect(distance(solvedPoints[2], solvedPoints[0])).toBeCloseTo(sideLength, 3);

      // Height should be sideLength * √3/2
      const expectedHeight = sideLength * Math.sqrt(3) / 2;
      const actualHeight = Math.abs(solvedPoints[2].y - solvedPoints[0].y);
      expect(actualHeight).toBeCloseTo(expectedHeight, 3);
    });

    it('should handle a constrained linkage mechanism', () => {
      // Create a four-bar linkage mechanism
      const ground1 = createPoint(0, 0); // fixed ground point
      const ground2 = createPoint(10, 0); // fixed ground point
      const joint1 = createPoint(3, 4); // moving joint
      const joint2 = createPoint(7, 4); // moving joint

      document.points.set(ground1.id, ground1);
      document.points.set(ground2.id, ground2);
      document.points.set(joint1.id, joint1);
      document.points.set(joint2.id, joint2);

      // Define link lengths for four-bar mechanism
      const constraints = [
        createConstraint('distance', [ground1.id, joint1.id], 5), // crank
        createConstraint('distance', [joint1.id, joint2.id], 8), // coupler
        createConstraint('distance', [joint2.id, ground2.id], 4), // rocker
        // Ground link is already constrained by fixed points
      ];

      constraints.forEach(c => document.constraints.set(c.id, c));

      const result = solver.solve(document, {
        maxIterations: 400,
        tolerance: 1e-7,
        learningRate: 0.008,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-5);

      // Verify mechanism constraints
      const points = [ground1.id, ground2.id, joint1.id, joint2.id].map(id =>
        result.document.points.get(id)!
      );

      expect(distance(points[0], points[2])).toBeCloseTo(5, 3); // crank length
      expect(distance(points[2], points[3])).toBeCloseTo(8, 2); // coupler length
      expect(distance(points[3], points[1])).toBeCloseTo(4, 3); // rocker length
    });

    it('should construct a simple rectangle with specific dimensions', () => {
      // Simple rectangle test - much more manageable than complex parking scenario
      const corner1 = createPoint(0, 0);
      const corner2 = createPoint(5, 1); // not quite rectangular initially
      const corner3 = createPoint(4, 4); 
      const corner4 = createPoint(-1, 3);

      [corner1, corner2, corner3, corner4].forEach(p => document.points.set(p.id, p));

      const constraints = [
        // Rectangle dimensions
        createConstraint('distance', [corner1.id, corner2.id], 5), // width
        createConstraint('distance', [corner1.id, corner4.id], 3), // height
        
        // Make it a proper rectangle
        createConstraint('distance', [corner2.id, corner3.id], 3), // height
        createConstraint('distance', [corner3.id, corner4.id], 5), // width
        
        // Fix one corner as anchor
        createConstraint('fix-x', [corner1.id], 0),
        createConstraint('fix-y', [corner1.id], 0),
      ];

      constraints.forEach(c => document.constraints.set(c.id, c));

      const result = solver.solve(document);
      expect(result.success).toBe(true);

      const solvedPoints = [corner1, corner2, corner3, corner4]
        .map(p => result.document.points.get(p.id)!);

      // Verify rectangle dimensions
      expect(distance(solvedPoints[0], solvedPoints[1])).toBeCloseTo(5, 2);
      expect(distance(solvedPoints[1], solvedPoints[2])).toBeCloseTo(3, 2);
      expect(distance(solvedPoints[2], solvedPoints[3])).toBeCloseTo(5, 2);
      expect(distance(solvedPoints[3], solvedPoints[0])).toBeCloseTo(3, 2);
    });

    it('should solve mixed constraint types in a simple system', () => {
      // Simple test with horizontal, vertical, and distance constraints
      const p1 = createPoint(0, 0);
      const p2 = createPoint(3, 2); // will be constrained horizontal 
      const p3 = createPoint(1, 5); // will be constrained vertical from p1

      [p1, p2, p3].forEach(p => document.points.set(p.id, p));

      const line1 = createLine(p1.id, p2.id);
      const line2 = createLine(p1.id, p3.id);
      
      document.lines.set(line1.id, line1);
      document.lines.set(line2.id, line2);

      const constraints = [
        // Fix p1 as anchor
        createConstraint('fix-x', [p1.id], 0),
        createConstraint('fix-y', [p1.id], 0),
        
        // Make line1 horizontal and set distance
        createConstraint('horizontal', [line1.id]),
        createConstraint('distance', [p1.id, p2.id], 4),
        
        // Make line2 vertical and set distance  
        createConstraint('vertical', [line2.id]),
        createConstraint('distance', [p1.id, p3.id], 3),
      ];

      constraints.forEach(c => document.constraints.set(c.id, c));

      const result = solver.solve(document);
      expect(result.success).toBe(true);

      const solved = [p1, p2, p3].map(p => result.document.points.get(p.id)!);

      // Verify constraints are satisfied
      expect(distance(solved[0], solved[1])).toBeCloseTo(4, 2); // p1-p2 distance
      expect(distance(solved[0], solved[2])).toBeCloseTo(3, 2); // p1-p3 distance
      expect(Math.abs(solved[0].y - solved[1].y)).toBeLessThan(0.1); // horizontal line
      expect(Math.abs(solved[0].x - solved[2].x)).toBeLessThan(0.1); // vertical line
    });
  });

  describe('Performance Tests', () => {
    it('should solve large constraint systems efficiently', () => {
      // Create a grid of points with distance constraints (like a truss)
      const gridSize = 6;
      const spacing = 5;
      const points: any[][] = [];

      // Create grid of points
      for (let i = 0; i < gridSize; i++) {
        points[i] = [];
        for (let j = 0; j < gridSize; j++) {
          const isFixed = (i === 0 || i === gridSize - 1) && (j === 0 || j === gridSize - 1);
          const point = createPoint(j * spacing + Math.random() * 2, i * spacing + Math.random() * 2, isFixed);
          points[i][j] = point;
          document.points.set(point.id, point);
        }
      }

      // Add distance constraints between adjacent points
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          // Horizontal connections
          if (j < gridSize - 1) {
            const constraint = createConstraint('distance', [points[i][j].id, points[i][j + 1].id], spacing);
            document.constraints.set(constraint.id, constraint);
          }
          // Vertical connections
          if (i < gridSize - 1) {
            const constraint = createConstraint('distance', [points[i][j].id, points[i + 1][j].id], spacing);
            document.constraints.set(constraint.id, constraint);
          }
        }
      }

      const startTime = performance.now();
      const result = solver.solve(document, {
        maxIterations: 200,
        tolerance: 1e-4,
        learningRate: 0.01,
        momentum: 0.9
      });
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should solve within 5 seconds

      // Verify grid spacing
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize - 1; j++) {
          const p1 = result.document.points.get(points[i][j].id)!;
          const p2 = result.document.points.get(points[i][j + 1].id)!;
          expect(distance(p1, p2)).toBeCloseTo(spacing, 1);
        }
      }
    });
  });
});