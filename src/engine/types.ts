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
}

export interface Circle {
	id: string
	centerId: string
	radiusPointId: string
}

export interface Label {
	id: string
	type: "coordinate" | "distance" | "angle"
	entityIds: string[] // Referenced point IDs
	offset: { x: number; y: number } // User-dragged offset from calculated position
}

export type GeometryEntity = Point | Line | Circle | Label

export type { ConstraintType } from "./constraint-types"

export interface Constraint {
	id: string
	type: ConstraintType
	entityIds: string[]
	value?: number
}

export interface Geometry {
	points: Map<string, Point>
	lines: Map<string, Line>
	circles: Map<string, Circle>
	labels: Map<string, Label>
	constraints: Map<string, Constraint>
}

export interface Viewport {
	x: number
	y: number
	canvasWidth: number
	canvasHeight: number
	scale: number
	zoom: number
}

// Utility class for computed viewport properties
export class ViewportCalcs {
	static worldWidth(viewport: Viewport): number {
		return viewport.scale / viewport.zoom * 1.2
	}
	
	static worldHeight(viewport: Viewport): number {
		const aspectRatio = viewport.canvasHeight / viewport.canvasWidth
		return this.worldWidth(viewport) * aspectRatio
	}
	
	static pixelsPerUnit(viewport: Viewport): number {
		return viewport.canvasWidth / this.worldWidth(viewport)
	}
	
	static visibleBounds(viewport: Viewport) {
		const worldWidth = this.worldWidth(viewport)
		const worldHeight = this.worldHeight(viewport)
		return {
			left: viewport.x - worldWidth / 2,
			right: viewport.x + worldWidth / 2,
			top: viewport.y - worldHeight / 2,
			bottom: viewport.y + worldHeight / 2
		}
	}
	
	static gridSpacing(viewport: Viewport): number {
		const scaleOverZoom = viewport.scale / viewport.zoom
		const logValue = Math.log10(scaleOverZoom)
		const roundedLog = Math.round(logValue)
		return Math.pow(10, roundedLog)
	}
	
	// Feature scaling: zoom-dependent but bounded at zoom=1
	static featureScale(viewport: Viewport): number {
		return viewport.zoom >= 1 ? 1 : viewport.zoom
	}
}

export type ToolType = "select" | "point" | "line" | "circle" | "label"

export interface SelectionState {
	selectedIds: Set<string>
	hoveredId: string | null
}
