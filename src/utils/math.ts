import { Point } from '../engine/models/types';

export const distance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const distancePointToLine = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) return distance(point, lineStart);
  
  const param = dot / lenSq;
  
  let closestX: number;
  let closestY: number;
  
  if (param < 0) {
    closestX = lineStart.x;
    closestY = lineStart.y;
  } else if (param > 1) {
    closestX = lineEnd.x;
    closestY = lineEnd.y;
  } else {
    closestX = lineStart.x + param * C;
    closestY = lineStart.y + param * D;
  }
  
  const dx = point.x - closestX;
  const dy = point.y - closestY;
  
  return Math.sqrt(dx * dx + dy * dy);
};

export const vectorDot = (v1: { x: number; y: number }, v2: { x: number; y: number }): number => {
  return v1.x * v2.x + v1.y * v2.y;
};

export const vectorNormalize = (v: { x: number; y: number }): { x: number; y: number } => {
  const length = Math.sqrt(v.x * v.x + v.y * v.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: v.x / length, y: v.y / length };
};

export const vectorFromPoints = (p1: Point, p2: Point): { x: number; y: number } => {
  return { x: p2.x - p1.x, y: p2.y - p1.y };
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};