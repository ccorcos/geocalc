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
      const p1 = createPoint(0, 0, true); // fixed corner
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
      const p1 = createPoint(0, 0, true); // fixed vertex
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

      expect(distance(solvedPoints[0], solvedPoints[1])).toBeCloseTo(sideLength, 4);
      expect(distance(solvedPoints[1], solvedPoints[2])).toBeCloseTo(sideLength, 4);
      expect(distance(solvedPoints[2], solvedPoints[0])).toBeCloseTo(sideLength, 4);

      // Height should be sideLength * √3/2
      const expectedHeight = sideLength * Math.sqrt(3) / 2;
      const actualHeight = Math.abs(solvedPoints[2].y - solvedPoints[0].y);
      expect(actualHeight).toBeCloseTo(expectedHeight, 3);
    });

    it('should handle a constrained linkage mechanism', () => {
      // Create a four-bar linkage mechanism
      const ground1 = createPoint(0, 0, true); // fixed ground point
      const ground2 = createPoint(10, 0, true); // fixed ground point
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
      expect(distance(points[2], points[3])).toBeCloseTo(8, 3); // coupler length
      expect(distance(points[3], points[1])).toBeCloseTo(4, 3); // rocker length
    });

    it('should solve parallel parking constraints', () => {
      // Simulate parallel parking: car must fit between two obstacles
      const obstacleRear = createPoint(0, 0, true);
      const obstacleFront = createPoint(20, 0, true);
      
      // Car corners (initially not parallel parked)
      const carRearLeft = createPoint(2, 5);
      const carRearRight = createPoint(2, 8);
      const carFrontLeft = createPoint(12, 6);
      const carFrontRight = createPoint(12, 9);

      [carRearLeft, carRearRight, carFrontLeft, carFrontRight, obstacleRear, obstacleFront]
        .forEach(p => document.points.set(p.id, p));

      // Car dimensions
      const carLength = 8;
      const carWidth = 3;

      // Car structure constraints
      const carLines = [
        createLine(carRearLeft.id, carRearRight.id), // rear
        createLine(carRearRight.id, carFrontRight.id), // right side
        createLine(carFrontRight.id, carFrontLeft.id), // front
        createLine(carFrontLeft.id, carRearLeft.id), // left side
      ];

      carLines.forEach(line => document.lines.set(line.id, line));

      const constraints = [
        // Car dimensions
        createConstraint('distance', [carRearLeft.id, carRearRight.id], carWidth),
        createConstraint('distance', [carRearLeft.id, carFrontLeft.id], carLength),
        createConstraint('distance', [carRearRight.id, carFrontRight.id], carLength),
        createConstraint('distance', [carFrontLeft.id, carFrontRight.id], carWidth),
        
        // Rectangle constraints (right angles)
        createConstraint('perpendicular', [carLines[0].id, carLines[1].id]),
        createConstraint('perpendicular', [carLines[1].id, carLines[2].id]),
        
        // Parallel to curb (y-coordinates same for front and rear)
        createConstraint('horizontal', [carLines[0].id]), // rear parallel to curb
        createConstraint('horizontal', [carLines[2].id]), // front parallel to curb
        
        // Close to curb
        createConstraint('distance', [carRearLeft.id, obstacleRear.id], 1), // near curb
      ];

      constraints.forEach(c => document.constraints.set(c.id, c));

      const result = solver.solve(document, {
        maxIterations: 600,
        tolerance: 1e-6,
        learningRate: 0.005,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-4);

      // Verify car is properly parallel parked
      const solvedCar = [carRearLeft, carRearRight, carFrontLeft, carFrontRight]
        .map(p => result.document.points.get(p.id)!);

      // Car should be rectangular
      expect(distance(solvedCar[0], solvedCar[1])).toBeCloseTo(carWidth, 2);
      expect(distance(solvedCar[0], solvedCar[2])).toBeCloseTo(carLength, 2);
      expect(distance(solvedCar[1], solvedCar[3])).toBeCloseTo(carLength, 2);
      expect(distance(solvedCar[2], solvedCar[3])).toBeCloseTo(carWidth, 2);

      // Car should be parallel to curb (same y-coordinates)
      expect(Math.abs(solvedCar[0].y - solvedCar[1].y)).toBeLessThan(0.1);
      expect(Math.abs(solvedCar[2].y - solvedCar[3].y)).toBeLessThan(0.1);

      // Car should fit between obstacles with some clearance
      const carRearX = Math.min(solvedCar[0].x, solvedCar[1].x);
      const carFrontX = Math.max(solvedCar[2].x, solvedCar[3].x);
      
      expect(carRearX).toBeGreaterThan(0.5); // clear of rear obstacle
      expect(carFrontX).toBeLessThan(19.5); // clear of front obstacle
    });

    it('should solve architectural drafting constraints', () => {
      // Design a simple house floor plan with rooms
      const corner1 = createPoint(0, 0, true); // fixed corner
      const corner2 = createPoint(20, 0); // house width
      const corner3 = createPoint(20, 15); // house depth
      const corner4 = createPoint(0, 15); // complete rectangle

      // Room dividers
      const dividerA = createPoint(8, 0); // kitchen/living room
      const dividerB = createPoint(8, 15); // kitchen/living room
      const dividerC = createPoint(0, 10); // bedroom division
      const dividerD = createPoint(8, 10); // bedroom division

      [corner1, corner2, corner3, corner4, dividerA, dividerB, dividerC, dividerD]
        .forEach(p => document.points.set(p.id, p));

      // Walls
      const walls = [
        createLine(corner1.id, corner2.id), // south wall
        createLine(corner2.id, corner3.id), // east wall  
        createLine(corner3.id, corner4.id), // north wall
        createLine(corner4.id, corner1.id), // west wall
        createLine(dividerA.id, dividerB.id), // room divider
        createLine(dividerC.id, dividerD.id), // bedroom divider
      ];

      walls.forEach(wall => document.lines.set(wall.id, wall));

      const constraints = [
        // House exterior dimensions
        createConstraint('distance', [corner1.id, corner2.id], 20), // width
        createConstraint('distance', [corner1.id, corner4.id], 15), // depth
        
        // Right angles for square/rectangular rooms
        createConstraint('perpendicular', [walls[0].id, walls[1].id]),
        createConstraint('perpendicular', [walls[1].id, walls[2].id]),
        createConstraint('perpendicular', [walls[2].id, walls[3].id]),
        createConstraint('perpendicular', [walls[3].id, walls[0].id]),
        
        // Room dividers perpendicular to walls
        createConstraint('perpendicular', [walls[4].id, walls[0].id]), // vertical divider
        createConstraint('perpendicular', [walls[5].id, walls[0].id]), // horizontal divider
        
        // Kitchen should be 8x10
        createConstraint('distance', [corner1.id, dividerA.id], 8),
        createConstraint('distance', [corner1.id, dividerC.id], 10),
        
        // Alignment constraints
        createConstraint('vertical', [walls[4].id]), // room divider vertical
        createConstraint('horizontal', [walls[5].id]), // bedroom divider horizontal
      ];

      constraints.forEach(c => document.constraints.set(c.id, c));

      const result = solver.solve(document, {
        maxIterations: 400,
        tolerance: 1e-6,
        learningRate: 0.01,
        momentum: 0.9
      });

      expect(result.success).toBe(true);
      expect(result.finalError).toBeLessThan(1e-4);

      // Verify house layout
      const solvedPoints = [corner1, corner2, corner3, corner4, dividerA, dividerB, dividerC, dividerD]
        .map(p => result.document.points.get(p.id)!);

      // House should be 20x15
      expect(distance(solvedPoints[0], solvedPoints[1])).toBeCloseTo(20, 3);
      expect(distance(solvedPoints[0], solvedPoints[3])).toBeCloseTo(15, 3);

      // Kitchen should be 8x10
      expect(distance(solvedPoints[0], solvedPoints[4])).toBeCloseTo(8, 3);
      expect(distance(solvedPoints[0], solvedPoints[6])).toBeCloseTo(10, 3);

      // Rooms should be rectangular
      expect(Math.abs(solvedPoints[4].y - solvedPoints[0].y)).toBeLessThan(0.1); // dividerA on south wall
      expect(Math.abs(solvedPoints[5].y - solvedPoints[3].y)).toBeLessThan(0.1); // dividerB on north wall
      expect(Math.abs(solvedPoints[6].x - solvedPoints[0].x)).toBeLessThan(0.1); // dividerC on west wall
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