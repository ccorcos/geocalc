import { Constraint, Point, GeometryDocument } from '../models/types';
import { distance, vectorFromPoints, vectorNormalize, vectorDot } from '../../utils/math';

export interface ConstraintViolation {
  constraintId: string;
  error: number;
  gradient: Map<string, { x: number; y: number }>;
}

export class ConstraintEvaluator {
  evaluate(constraint: Constraint, document: GeometryDocument): ConstraintViolation {
    switch (constraint.type) {
      case 'distance':
        return this.evaluateDistance(constraint, document);
      case 'parallel':
        return this.evaluateParallel(constraint, document);
      case 'perpendicular':
        return this.evaluatePerpendicular(constraint, document);
      case 'horizontal':
        return this.evaluateHorizontal(constraint, document);
      case 'vertical':
        return this.evaluateVertical(constraint, document);
      case 'fix-x':
        return this.evaluateFixX(constraint, document);
      case 'fix-y':
        return this.evaluateFixY(constraint, document);
      default:
        return {
          constraintId: constraint.id,
          error: 0,
          gradient: new Map(),
        };
    }
  }

  private evaluateDistance(constraint: Constraint, document: GeometryDocument): ConstraintViolation {
    if (constraint.entityIds.length !== 2 || constraint.value === undefined) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const point1 = document.points.get(constraint.entityIds[0]);
    const point2 = document.points.get(constraint.entityIds[1]);

    if (!point1 || !point2) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const currentDistance = distance(point1, point2);
    const targetDistance = constraint.value;
    const error = (currentDistance - targetDistance) ** 2;

    // Gradient calculation
    const gradient = new Map<string, { x: number; y: number }>();
    
    if (currentDistance > 0) {
      const factor = 2 * (currentDistance - targetDistance) / currentDistance;
      
      gradient.set(point1.id, {
        x: factor * (point1.x - point2.x),
        y: factor * (point1.y - point2.y),
      });
      
      gradient.set(point2.id, {
        x: factor * (point2.x - point1.x),
        y: factor * (point2.y - point1.y),
      });
    }

    return { constraintId: constraint.id, error, gradient };
  }

  private evaluateParallel(constraint: Constraint, document: GeometryDocument): ConstraintViolation {
    if (constraint.entityIds.length !== 2) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const line1 = document.lines.get(constraint.entityIds[0]);
    const line2 = document.lines.get(constraint.entityIds[1]);

    if (!line1 || !line2) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const p1a = document.points.get(line1.point1Id);
    const p1b = document.points.get(line1.point2Id);
    const p2a = document.points.get(line2.point1Id);
    const p2b = document.points.get(line2.point2Id);

    if (!p1a || !p1b || !p2a || !p2b) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const v1 = vectorNormalize(vectorFromPoints(p1a, p1b));
    const v2 = vectorNormalize(vectorFromPoints(p2a, p2b));
    
    // For parallel lines, dot product should be ±1
    const dot = vectorDot(v1, v2);
    const error = (1 - dot * dot) ** 2;

    // Simplified gradient calculation (more complex analytical gradient would be better)
    const gradient = new Map<string, { x: number; y: number }>();
    const epsilon = 1e-6;

    // Numerical gradient approximation
    [p1a, p1b, p2a, p2b].forEach(point => {

      const originalX = point.x;
      const originalY = point.y;

      // X gradient
      point.x = originalX + epsilon;
      const v1x = vectorNormalize(vectorFromPoints(p1a, p1b));
      const v2x = vectorNormalize(vectorFromPoints(p2a, p2b));
      const dotX = vectorDot(v1x, v2x);
      const errorX = (1 - dotX * dotX) ** 2;
      
      point.x = originalX;
      
      // Y gradient
      point.y = originalY + epsilon;
      const v1y = vectorNormalize(vectorFromPoints(p1a, p1b));
      const v2y = vectorNormalize(vectorFromPoints(p2a, p2b));
      const dotY = vectorDot(v1y, v2y);
      const errorY = (1 - dotY * dotY) ** 2;
      
      point.y = originalY;

      gradient.set(point.id, {
        x: (errorX - error) / epsilon,
        y: (errorY - error) / epsilon,
      });
    });

    return { constraintId: constraint.id, error, gradient };
  }

  private evaluatePerpendicular(constraint: Constraint, document: GeometryDocument): ConstraintViolation {
    if (constraint.entityIds.length !== 2) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const line1 = document.lines.get(constraint.entityIds[0]);
    const line2 = document.lines.get(constraint.entityIds[1]);

    if (!line1 || !line2) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const p1a = document.points.get(line1.point1Id);
    const p1b = document.points.get(line1.point2Id);
    const p2a = document.points.get(line2.point1Id);
    const p2b = document.points.get(line2.point2Id);

    if (!p1a || !p1b || !p2a || !p2b) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const v1 = vectorNormalize(vectorFromPoints(p1a, p1b));
    const v2 = vectorNormalize(vectorFromPoints(p2a, p2b));
    
    // For perpendicular lines, dot product should be 0
    const dot = vectorDot(v1, v2);
    const error = dot ** 2;

    // Numerical gradient (similar to parallel)
    const gradient = new Map<string, { x: number; y: number }>();
    const epsilon = 1e-6;

    [p1a, p1b, p2a, p2b].forEach(point => {

      const originalX = point.x;
      const originalY = point.y;

      // X gradient
      point.x = originalX + epsilon;
      const v1x = vectorNormalize(vectorFromPoints(p1a, p1b));
      const v2x = vectorNormalize(vectorFromPoints(p2a, p2b));
      const dotX = vectorDot(v1x, v2x);
      const errorX = dotX ** 2;
      
      point.x = originalX;
      
      // Y gradient
      point.y = originalY + epsilon;
      const v1y = vectorNormalize(vectorFromPoints(p1a, p1b));
      const v2y = vectorNormalize(vectorFromPoints(p2a, p2b));
      const dotY = vectorDot(v1y, v2y);
      const errorY = dotY ** 2;
      
      point.y = originalY;

      gradient.set(point.id, {
        x: (errorX - error) / epsilon,
        y: (errorY - error) / epsilon,
      });
    });

    return { constraintId: constraint.id, error, gradient };
  }

  private evaluateHorizontal(constraint: Constraint, document: GeometryDocument): ConstraintViolation {
    if (constraint.entityIds.length !== 1) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const line = document.lines.get(constraint.entityIds[0]);
    if (!line) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const p1 = document.points.get(line.point1Id);
    const p2 = document.points.get(line.point2Id);

    if (!p1 || !p2) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const dy = p2.y - p1.y;
    const error = dy ** 2;

    const gradient = new Map<string, { x: number; y: number }>();
    
    gradient.set(p1.id, { x: 0, y: -2 * dy });
    gradient.set(p2.id, { x: 0, y: 2 * dy });

    return { constraintId: constraint.id, error, gradient };
  }

  private evaluateVertical(constraint: Constraint, document: GeometryDocument): ConstraintViolation {
    if (constraint.entityIds.length !== 1) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const line = document.lines.get(constraint.entityIds[0]);
    if (!line) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const p1 = document.points.get(line.point1Id);
    const p2 = document.points.get(line.point2Id);

    if (!p1 || !p2) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const dx = p2.x - p1.x;
    const error = dx ** 2;

    const gradient = new Map<string, { x: number; y: number }>();
    
    gradient.set(p1.id, { x: -2 * dx, y: 0 });
    gradient.set(p2.id, { x: 2 * dx, y: 0 });

    return { constraintId: constraint.id, error, gradient };
  }

  private evaluateFixX(constraint: Constraint, document: GeometryDocument): ConstraintViolation {
    if (constraint.entityIds.length !== 1 || constraint.value === undefined) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const point = document.points.get(constraint.entityIds[0]);
    if (!point) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const targetX = constraint.value;
    const currentX = point.x;
    const error = (currentX - targetX) ** 2;

    const gradient = new Map<string, { x: number; y: number }>();
    gradient.set(point.id, {
      x: 2 * (currentX - targetX), // Gradient with respect to x
      y: 0, // No gradient with respect to y
    });

    return { constraintId: constraint.id, error, gradient };
  }

  private evaluateFixY(constraint: Constraint, document: GeometryDocument): ConstraintViolation {
    if (constraint.entityIds.length !== 1 || constraint.value === undefined) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const point = document.points.get(constraint.entityIds[0]);
    if (!point) {
      return { constraintId: constraint.id, error: 0, gradient: new Map() };
    }

    const targetY = constraint.value;
    const currentY = point.y;
    const error = (currentY - targetY) ** 2;

    const gradient = new Map<string, { x: number; y: number }>();
    gradient.set(point.id, {
      x: 0, // No gradient with respect to x
      y: 2 * (currentY - targetY), // Gradient with respect to y
    });

    return { constraintId: constraint.id, error, gradient };
  }
}