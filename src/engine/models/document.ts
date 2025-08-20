import { GeometryDocument, Point, Line, Circle, Constraint } from './types';
import { generateId } from '../../utils/ids';

export const createEmptyDocument = (): GeometryDocument => ({
  points: new Map(),
  lines: new Map(),
  circles: new Map(),
  constraints: new Map(),
  metadata: {
    version: '1.0.0',
    created: new Date(),
    modified: new Date(),
  },
});

export const createPoint = (x: number, y: number, fixed = false): Point => ({
  id: generateId(),
  x,
  y,
  fixed,
});

export const createLine = (point1Id: string, point2Id: string, infinite = false): Line => ({
  id: generateId(),
  point1Id,
  point2Id,
  infinite,
});

export const createCircle = (centerId: string, radius: number): Circle => ({
  id: generateId(),
  centerId,
  radius,
});

export const createConstraint = (
  type: Constraint['type'],
  entityIds: string[],
  value?: number,
  priority = 1
): Constraint => ({
  id: generateId(),
  type,
  entityIds,
  value,
  priority,
});

export const addPointToDocument = (document: GeometryDocument, point: Point): GeometryDocument => {
  const newPoints = new Map(document.points);
  newPoints.set(point.id, point);
  
  return {
    ...document,
    points: newPoints,
    metadata: {
      ...document.metadata,
      modified: new Date(),
    },
  };
};

export const addLineToDocument = (document: GeometryDocument, line: Line): GeometryDocument => {
  const newLines = new Map(document.lines);
  newLines.set(line.id, line);
  
  return {
    ...document,
    lines: newLines,
    metadata: {
      ...document.metadata,
      modified: new Date(),
    },
  };
};

export const addCircleToDocument = (document: GeometryDocument, circle: Circle): GeometryDocument => {
  const newCircles = new Map(document.circles);
  newCircles.set(circle.id, circle);
  
  return {
    ...document,
    circles: newCircles,
    metadata: {
      ...document.metadata,
      modified: new Date(),
    },
  };
};

export const addConstraintToDocument = (document: GeometryDocument, constraint: Constraint): GeometryDocument => {
  const newConstraints = new Map(document.constraints);
  newConstraints.set(constraint.id, constraint);
  
  return {
    ...document,
    constraints: newConstraints,
    metadata: {
      ...document.metadata,
      modified: new Date(),
    },
  };
};