// Import centralized constraint types
import type { ConstraintType } from "./constraint-types"

export interface Point {
	id: string
	x: number
	y: number
}

export interface Line {
	id: string
	point1Id: string
	point2Id: string
	infinite: boolean
}

export interface Circle {
	id: string
	centerId: string
	radiusPointId: string
}

export interface Label {
	id: string
	type: "coordinate" | "distance" | "angle"
	entityIds: string[]  // Referenced point IDs
	offset: { x: number; y: number }  // User-dragged offset from calculated position
	visible: boolean
}

export type GeometryEntity = Point | Line | Circle | Label

export type { ConstraintType } from "./constraint-types"

export interface Constraint {
	id: string
	type: ConstraintType
	entityIds: string[]
	value?: number
	priority: number
}

export interface Geometry {
	points: Map<string, Point>
	lines: Map<string, Line>
	circles: Map<string, Circle>
	labels: Map<string, Label>
	constraints: Map<string, Constraint>
	metadata: {
		version: string
		created: Date
		modified: Date
	}
}

export interface Viewport {
	x: number
	y: number
	zoom: number
	width: number
	height: number
}

export type ToolType = "select" | "point" | "line" | "circle" | "label"

export interface SelectionState {
	selectedIds: Set<string>
	hoveredId: string | null
}
