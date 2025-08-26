export interface Point {
  id: string;
  x: number;
  y: number;
}

export interface Line {
  id: string;
  point1Id: string;
  point2Id: string;
  infinite: boolean;
}

export interface Circle {
  id: string;
  centerId: string;
  radius: number;
}

export type GeometryEntity = Point | Line | Circle;

export type ConstraintType =
  | "distance"
  | "x-distance"
  | "y-distance"
  | "parallel"
  | "perpendicular"
  | "tangent"
  | "angle"
  | "horizontal"
  | "vertical"
  | "fix-x"
  | "fix-y"
  | "same-x"
  | "same-y"
  | "fix-radius";

export interface Constraint {
  id: string;
  type: ConstraintType;
  entityIds: string[];
  value?: number;
  priority: number;
}

export interface Geometry {
  points: Map<string, Point>;
  lines: Map<string, Line>;
  circles: Map<string, Circle>;
  constraints: Map<string, Constraint>;
  metadata: {
    version: string;
    created: Date;
    modified: Date;
  };
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export type ToolType = "select" | "point" | "line" | "circle";

export interface SelectionState {
  selectedIds: Set<string>;
  hoveredId: string | null;
}
