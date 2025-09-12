import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

import { GradientDescentSolver } from "./engine/GradientDescentSolver"
import { createEmptyGeometry } from "./engine/geometry"
import {
	fitToDrawing,
	centerViewport,
	resetViewport
} from "./engine/viewport-utils"
import {
	Circle,
	Constraint,
	Geometry,
	Label,
	Line,
	Point,
	SelectionState,
	ToolType,
	Viewport,
} from "./engine/types"
import {
	CURRENT_STORAGE_VERSION,
	StorageFormat,
	migrateStorageFormat,
} from "./migrations"

// localStorage persistence functions
const STORAGE_KEY = "geocalc-geometry"

const serializeGeometry = (geometry: Geometry): string => {
	const storageFormat: StorageFormat = {
		version: CURRENT_STORAGE_VERSION,
		geometry: {
			points: Array.from(geometry.points.entries()),
			lines: Array.from(geometry.lines.entries()),
			circles: Array.from(geometry.circles.entries()),
			labels: Array.from(geometry.labels.entries()),
			constraints: Array.from(geometry.constraints.entries()),
		},
	}
	return JSON.stringify(storageFormat)
}


const deserializeGeometry = (data: string): Geometry => {
	try {
		const parsed = JSON.parse(data)
		const migrated = migrateStorageFormat(parsed)
		
		return {
			points: new Map(migrated.geometry.points || []),
			lines: new Map(migrated.geometry.lines || []),
			circles: new Map(migrated.geometry.circles || []),
			labels: new Map(migrated.geometry.labels || []),
			constraints: new Map(migrated.geometry.constraints || []),
		}
	} catch (error) {
		console.warn("Failed to deserialize geometry from localStorage:", error)
		return createEmptyGeometry()
	}
}

const saveGeometry = (geometry: Geometry) => {
	try {
		localStorage.setItem(STORAGE_KEY, serializeGeometry(geometry))
	} catch (error) {
		console.warn("Failed to save geometry to localStorage:", error)
	}
}

const loadGeometry = (): Geometry => {
	try {
		const data = localStorage.getItem(STORAGE_KEY)
		return data ? deserializeGeometry(data) : createEmptyGeometry()
	} catch (error) {
		console.warn("Failed to load geometry from localStorage:", error)
		return createEmptyGeometry()
	}
}

export const clearPersistedGeometry = () => {
	try {
		localStorage.removeItem(STORAGE_KEY)
	} catch (error) {
		console.warn("Failed to clear geometry from localStorage:", error)
	}
}

export const resetGeometry = () => {
	const emptyGeometry = createEmptyGeometry()
	useStore.getState().setGeometry(emptyGeometry)
}

interface AppState {
	geometry: Geometry
	currentTool: ToolType
	viewport: Viewport
	selection: SelectionState
	selectedConstraintId: string | null
	isDragging: boolean
	dragStartPoint: { x: number; y: number } | null
	isSolving: boolean

	// Actions
	setGeometry: (geometry: Geometry) => void
	setCurrentTool: (tool: ToolType) => void
	setViewport: (viewport: Partial<Viewport>) => void
	setSelection: (selection: Partial<SelectionState>) => void
	setSelectedConstraintId: (constraintId: string | null) => void
	setDragState: (
		isDragging: boolean,
		dragStartPoint?: { x: number; y: number } | null
	) => void

	// Geometry actions
	addPoint: (point: Point) => void
	addLine: (line: Line) => void
	addCircle: (circle: Circle) => void
	addLabel: (label: Label) => void
	addConstraint: (constraint: Constraint) => void
	updateConstraint: (id: string, updates: Partial<Constraint>) => void
	updatePoint: (id: string, updates: Partial<Point>) => void
	updateCircle: (id: string, updates: Partial<Circle>) => void
	updateLabel: (id: string, updates: Partial<Label>) => void
	addFixXConstraint: (pointId: string, value: number) => void
	addFixYConstraint: (pointId: string, value: number) => void
	removeFixXConstraint: (pointId: string) => void
	removeFixYConstraint: (pointId: string) => void
	getFixXConstraint: (pointId: string) => Constraint | null
	getFixYConstraint: (pointId: string) => Constraint | null
	getLineLengthConstraint: (lineId: string) => Constraint | null
	addLineLengthConstraint: (lineId: string, length: number) => void
	removeLineLengthConstraint: (lineId: string) => void
	removeEntity: (id: string) => void

	// Solver actions
	solve: () => void

	// Viewport actions
	panViewport: (dx: number, dy: number) => void
	zoomViewport: (factor: number, centerX?: number, centerY?: number) => void
	fitViewportToDrawing: () => void
	centerViewportOnDrawing: () => void
	resetViewportToDrawing: () => void
	setDisplayScale: (scale: number) => void
	screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
	worldToScreen: (worldX: number, worldY: number) => { x: number; y: number }
}

const solver = new GradientDescentSolver()

export const useStore = create<AppState>()(
	immer((set, get) => ({
		geometry: loadGeometry(),
		currentTool: "select",
		viewport: {
			x: 0,
			y: 0,
			zoom: 1,
			width: 800,
			height: 600,
			displayScale: 100,
		},
		selection: {
			selectedIds: new Set(),
			hoveredId: null,
		},
		selectedConstraintId: null,
		isDragging: false,
		dragStartPoint: null,
		isSolving: false,

		setGeometry: (geometry) =>
			set((state) => {
				state.geometry = geometry
				saveGeometry(geometry)
			}),

		setCurrentTool: (tool) => set({ currentTool: tool }),

		setViewport: (viewportUpdate) =>
			set((state) => {
				Object.assign(state.viewport, viewportUpdate)
			}),

		setSelection: (selectionUpdate) =>
			set((state) => {
				if (selectionUpdate.selectedIds !== undefined) {
					state.selection.selectedIds = new Set(selectionUpdate.selectedIds)
					// Clear constraint selection when entities are selected
					if (state.selection.selectedIds.size > 0) {
						state.selectedConstraintId = null
					}
				}
				if (selectionUpdate.hoveredId !== undefined) {
					state.selection.hoveredId = selectionUpdate.hoveredId
				}
			}),

		setSelectedConstraintId: (constraintId) =>
			set((state) => {
				state.selectedConstraintId = constraintId
				// Clear entity selection when constraint is selected
				if (constraintId !== null) {
					state.selection.selectedIds = new Set()
				}
			}),

		setDragState: (isDragging, dragStartPoint = null) =>
			set({
				isDragging,
				dragStartPoint,
			}),

		addPoint: (point) =>
			set((state) => {
				state.geometry.points.set(point.id, point)
				saveGeometry(state.geometry)
			}),

		addLine: (line) =>
			set((state) => {
				state.geometry.lines.set(line.id, line)
				saveGeometry(state.geometry)
			}),

		addCircle: (circle) =>
			set((state) => {
				state.geometry.circles.set(circle.id, circle)
				saveGeometry(state.geometry)
			}),

		addLabel: (label) =>
			set((state) => {
				state.geometry.labels.set(label.id, label)
				saveGeometry(state.geometry)
			}),

		addConstraint: (constraint) =>
			set((state) => {
				state.geometry.constraints.set(constraint.id, constraint)
				saveGeometry(state.geometry)
			}),

		updateConstraint: (id, updates) =>
			set((state) => {
				const constraint = state.geometry.constraints.get(id)
				if (constraint) {
					Object.assign(constraint, updates)
						saveGeometry(state.geometry)
				}
			}),

		updatePoint: (id, updates) =>
			set((state) => {
				const point = state.geometry.points.get(id)
				if (point) {
					Object.assign(point, updates)
						saveGeometry(state.geometry)
				}
			}),

		updateCircle: (id, updates) =>
			set((state) => {
				const circle = state.geometry.circles.get(id)
				if (circle) {
					Object.assign(circle, updates)
						saveGeometry(state.geometry)
				}
			}),

		updateLabel: (id, updates) =>
			set((state) => {
				const label = state.geometry.labels.get(id)
				if (label) {
					Object.assign(label, updates)
						saveGeometry(state.geometry)
				}
			}),

		addFixXConstraint: (pointId, value) =>
			set((state) => {
				const fixXConstraint = {
					id: `x-${pointId}`,
					type: "x" as const,
					entityIds: [pointId],
					value,
					priority: 1,
				}
				state.geometry.constraints.set(fixXConstraint.id, fixXConstraint)
				saveGeometry(state.geometry)
			}),

		addFixYConstraint: (pointId, value) =>
			set((state) => {
				const fixYConstraint = {
					id: `y-${pointId}`,
					type: "y" as const,
					entityIds: [pointId],
					value,
					priority: 1,
				}
				state.geometry.constraints.set(fixYConstraint.id, fixYConstraint)
				saveGeometry(state.geometry)
			}),

		removeFixXConstraint: (pointId) =>
			set((state) => {
				const constraintId = `x-${pointId}`
				state.geometry.constraints.delete(constraintId)
				saveGeometry(state.geometry)
			}),

		removeFixYConstraint: (pointId) =>
			set((state) => {
				const constraintId = `y-${pointId}`
				state.geometry.constraints.delete(constraintId)
				saveGeometry(state.geometry)
			}),

		getFixXConstraint: (pointId) => {
			const state = get()
			return state.geometry.constraints.get(`x-${pointId}`) || null
		},

		getFixYConstraint: (pointId) => {
			const state = get()
			return state.geometry.constraints.get(`y-${pointId}`) || null
		},

		getLineLengthConstraint: (lineId) => {
			const state = get()
			return state.geometry.constraints.get(`line-length-${lineId}`) || null
		},

		addLineLengthConstraint: (lineId, length) =>
			set((state) => {
				const line = state.geometry.lines.get(lineId)
				if (line) {
					const lengthConstraint = {
						id: `line-length-${lineId}`,
						type: "distance" as const,
						entityIds: [line.point1Id, line.point2Id],
						value: length,
						priority: 1,
					}
					state.geometry.constraints.set(lengthConstraint.id, lengthConstraint)
						saveGeometry(state.geometry)
				}
			}),

		removeLineLengthConstraint: (lineId) =>
			set((state) => {
				const constraintId = `line-length-${lineId}`
				state.geometry.constraints.delete(constraintId)
				saveGeometry(state.geometry)
			}),

		removeEntity: (id) =>
			set((state) => {
				// Check if we're deleting a constraint
				const isConstraint = state.geometry.constraints.has(id)

				if (isConstraint) {
					// For constraints, only delete the constraint itself
					state.geometry.constraints.delete(id)
					if (state.selectedConstraintId === id) {
						state.selectedConstraintId = null
					}
				} else {
					// For entities, use cascade deletion logic
					// Track which entities need to be deleted
					const toDelete = new Set([id])

					// If deleting a point, find dependent lines and circles
					if (state.geometry.points.has(id)) {
						// Find lines that use this point
						for (const [lineId, line] of state.geometry.lines) {
							if (line.point1Id === id || line.point2Id === id) {
								toDelete.add(lineId)
							}
						}

						// Find circles that use this point as center
						for (const [circleId, circle] of state.geometry.circles) {
							if (circle.centerId === id) {
								toDelete.add(circleId)
							}
						}
					}

					// Find labels that depend on any entity being deleted
					for (const [labelId, label] of state.geometry.labels) {
						if (label.entityIds.some((entityId) => toDelete.has(entityId))) {
							toDelete.add(labelId)
						}
					}

					// Find constraints that depend on any entity being deleted
					for (const [constraintId, constraint] of state.geometry.constraints) {
						if (
							constraint.entityIds.some((entityId) => toDelete.has(entityId))
						) {
							toDelete.add(constraintId)
						}
					}

					// Delete all entities and constraints
					for (const entityId of toDelete) {
						state.geometry.points.delete(entityId)
						state.geometry.lines.delete(entityId)
						state.geometry.circles.delete(entityId)
						state.geometry.labels.delete(entityId)
						state.geometry.constraints.delete(entityId)
						state.selection.selectedIds.delete(entityId)

						if (state.selection.hoveredId === entityId) {
							state.selection.hoveredId = null
						}

						if (state.selectedConstraintId === entityId) {
							state.selectedConstraintId = null
						}
					}
				}

				saveGeometry(state.geometry)
			}),

		solve: () => {
			const state = useStore.getState()
			if (state.isSolving) return

			useStore.setState({ isSolving: true })

			try {
				const result = solver.solve(state.geometry)

				if (result.success) {
					// Update the document with solved positions
					saveGeometry(result.geometry)
					useStore.setState({ geometry: result.geometry, isSolving: false })
				} else {
					console.warn("Solver failed to converge", result)
					useStore.setState({ isSolving: false })
				}
			} catch (error) {
				console.error("Solver error:", error)
				useStore.setState({ isSolving: false })
			}
		},

		panViewport: (dx, dy) =>
			set((state) => {
				state.viewport.x += dx
				state.viewport.y += dy
			}),

		zoomViewport: (factor, centerX = 0, centerY = 0) =>
			set((state) => {
				const oldZoom = state.viewport.zoom
				const newZoom = Math.max(0.1, Math.min(100, oldZoom * factor))

				if (newZoom !== oldZoom) {
					// Get the world point under the mouse BEFORE zoom change
					const worldPointBeforeZoom = {
						x:
							(centerX - state.viewport.width / 2) / oldZoom + state.viewport.x,
						y:
							(centerY - state.viewport.height / 2) / oldZoom +
							state.viewport.y,
					}

					// Change the zoom level
					state.viewport.zoom = newZoom

					// Calculate where that same world point would be AFTER zoom change
					const worldPointAfterZoom = {
						x:
							(centerX - state.viewport.width / 2) / newZoom + state.viewport.x,
						y:
							(centerY - state.viewport.height / 2) / newZoom +
							state.viewport.y,
					}

					// Adjust viewport position to keep the world point under the mouse
					state.viewport.x += worldPointBeforeZoom.x - worldPointAfterZoom.x
					state.viewport.y += worldPointBeforeZoom.y - worldPointAfterZoom.y
				}
			}),

		screenToWorld: (screenX, screenY) => {
			const { viewport } = get()
			return {
				x: (screenX - viewport.width / 2) / viewport.zoom + viewport.x,
				y: (screenY - viewport.height / 2) / viewport.zoom + viewport.y,
			}
		},

		worldToScreen: (worldX, worldY) => {
			const { viewport } = get()
			return {
				x: (worldX - viewport.x) * viewport.zoom + viewport.width / 2,
				y: (worldY - viewport.y) * viewport.zoom + viewport.height / 2,
			}
		},

		fitViewportToDrawing: () =>
			set((state) => {
				const newViewport = fitToDrawing(state.geometry, state.viewport)
				Object.assign(state.viewport, newViewport)
			}),

		centerViewportOnDrawing: () =>
			set((state) => {
				const newViewport = centerViewport(state.geometry, state.viewport)
				Object.assign(state.viewport, newViewport)
			}),

		resetViewportToDrawing: () =>
			set((state) => {
				const newViewport = resetViewport(state.geometry, state.viewport)
				Object.assign(state.viewport, newViewport)
			}),

		setDisplayScale: (scale) =>
			set((state) => {
				state.viewport.displayScale = Math.max(1, Math.min(10000, scale))
			}),
	}))
)
