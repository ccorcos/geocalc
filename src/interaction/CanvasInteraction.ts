import {
	createLine,
	createPoint,
	getCircleRadius,
} from "../engine/geometry"
import { calculateLabelPosition } from "../engine/label-positioning"
import { Point, ViewportCalcs } from "../engine/types"
import { generateId } from "../ids"
import { useStore } from "../store"

export class CanvasInteraction {
	private canvas: HTMLCanvasElement
	private isMouseDown = false
	private currentMousePos = { x: 0, y: 0 }
	private tempLineStart: Point | null = null
	private tempCircleCenter: Point | null = null
	private selectionRect: {
		startX: number
		startY: number
		endX: number
		endY: number
	} | null = null

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas
		this.setupEventListeners()
	}

	private setupEventListeners(): void {
		this.canvas.addEventListener("mousedown", this.handleMouseDown)
		this.canvas.addEventListener("mousemove", this.handleMouseMove)
		this.canvas.addEventListener("mouseup", this.handleMouseUp)
		this.canvas.addEventListener("contextmenu", this.handleContextMenu)
		this.canvas.addEventListener("wheel", this.handleWheel)
		this.canvas.addEventListener("mouseleave", this.handleMouseLeave)
	}

	private removeEventListeners(): void {
		this.canvas.removeEventListener("mousedown", this.handleMouseDown)
		this.canvas.removeEventListener("mousemove", this.handleMouseMove)
		this.canvas.removeEventListener("mouseup", this.handleMouseUp)
		this.canvas.removeEventListener("contextmenu", this.handleContextMenu)
		this.canvas.removeEventListener("wheel", this.handleWheel)
		this.canvas.removeEventListener("mouseleave", this.handleMouseLeave)
	}

	private getMousePos(e: MouseEvent): { x: number; y: number } {
		const rect = this.canvas.getBoundingClientRect()
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		}
	}

	private getWorldPos(
		screenX: number,
		screenY: number
	): { x: number; y: number } {
		const store = useStore.getState()
		return store.screenToWorld(screenX, screenY)
	}

	private findEntityAt(worldX: number, worldY: number): string | null {
		const store = useStore.getState()
		const { geometry } = store
		const pixelsPerUnit = ViewportCalcs.pixelsPerUnit(store.viewport, store.geometry.scale)
		const tolerance = 10 / pixelsPerUnit // Scale tolerance with zoom

		// Collect all entities within tolerance with their distances
		const candidates: Array<{ id: string; distance: number; type: string }> = []

		// Check points
		for (const [id, point] of geometry.points) {
			const dist = Math.sqrt((point.x - worldX) ** 2 + (point.y - worldY) ** 2)
			if (dist <= tolerance) {
				candidates.push({ id, distance: dist, type: "point" })
			}
		}

		// Check lines
		for (const [id, line] of geometry.lines) {
			const point1 = geometry.points.get(line.point1Id)
			const point2 = geometry.points.get(line.point2Id)
			if (!point1 || !point2) continue

			const dist = this.distanceToLineSegment(
				{ x: worldX, y: worldY },
				{ x: point1.x, y: point1.y },
				{ x: point2.x, y: point2.y }
			)

			if (dist <= tolerance) {
				candidates.push({ id, distance: dist, type: "line" })
			}
		}

		// Check circles
		for (const [id, circle] of geometry.circles) {
			const center = geometry.points.get(circle.centerId)
			if (!center) continue

			const distToCenter = Math.sqrt(
				(center.x - worldX) ** 2 + (center.y - worldY) ** 2
			)
			const distToCircle = Math.abs(
				distToCenter - getCircleRadius(circle, store.geometry)
			)

			if (distToCircle <= tolerance) {
				candidates.push({ id, distance: distToCircle, type: "circle" })
			}
		}

		// Check labels (use larger tolerance since they're rectangular)
		for (const [id, label] of geometry.labels) {
			const position = calculateLabelPosition(label, geometry)
			if (!position) continue

			// Simple rectangular hit test for label text
			const textWidth = 60 // Approximate text width
			const textHeight = 20 // Approximate text height

			if (
				worldX >= position.x - textWidth / 2 &&
				worldX <= position.x + textWidth / 2 &&
				worldY >= position.y - textHeight / 2 &&
				worldY <= position.y + textHeight / 2
			) {
				// Calculate distance to center of label for comparison
				const distToLabel = Math.sqrt(
					(worldX - position.x) ** 2 + (worldY - position.y) ** 2
				)
				candidates.push({ id, distance: distToLabel, type: "label" })
			}
		}

		if (candidates.length === 0) {
			return null
		}

		// Apply selection logic based on context and distance
		return this.selectBestCandidate(candidates, worldX, worldY)
	}

	private selectBestCandidate(
		candidates: Array<{ id: string; distance: number; type: string }>,
		_worldX: number,
		_worldY: number
	): string {
		// If only one candidate, return it
		if (candidates.length === 1) {
			return candidates[0].id
		}

		// Sort by distance (closest first)
		candidates.sort((a, b) => a.distance - b.distance)

		const closest = candidates[0]
		const secondClosest = candidates[1]

		// If the closest is significantly closer (>5 pixels difference), prefer it
		const store = useStore.getState()
		const pixelsPerUnit = ViewportCalcs.pixelsPerUnit(store.viewport, store.geometry.scale)
		const significantDistance = 5 / pixelsPerUnit

		if (closest.distance + significantDistance < secondClosest.distance) {
			return closest.id
		}

		// For close competitors, apply context rules:

		// 1. Always prefer points over everything else when very close
		const pointCandidate = candidates.find((c) => c.type === "point")
		if (
			pointCandidate &&
			pointCandidate.distance <= closest.distance + significantDistance / 2
		) {
			return pointCandidate.id
		}

		// 2. Prefer interactive geometry (lines, circles) over labels
		const geometryCandidate = candidates.find(
			(c) => c.type === "line" || c.type === "circle"
		)
		const labelCandidate = candidates.find((c) => c.type === "label")

		if (
			geometryCandidate &&
			labelCandidate &&
			geometryCandidate.distance <=
				labelCandidate.distance + significantDistance
		) {
			return geometryCandidate.id
		}

		// 3. Default to closest
		return closest.id
	}

	private getEntitiesInRect(rect: {
		startX: number
		startY: number
		endX: number
		endY: number
	}): Set<string> {
		const store = useStore.getState()
		const { geometry } = store
		const selectedIds = new Set<string>()

		// Normalize rectangle coordinates
		const minX = Math.min(rect.startX, rect.endX)
		const maxX = Math.max(rect.startX, rect.endX)
		const minY = Math.min(rect.startY, rect.endY)
		const maxY = Math.max(rect.startY, rect.endY)

		// Check points
		for (const [id, point] of geometry.points) {
			if (
				point.x >= minX &&
				point.x <= maxX &&
				point.y >= minY &&
				point.y <= maxY
			) {
				selectedIds.add(id)
			}
		}

		// Check lines (select if both endpoints are in rectangle)
		for (const [id, line] of geometry.lines) {
			const point1 = geometry.points.get(line.point1Id)
			const point2 = geometry.points.get(line.point2Id)
			if (point1 && point2) {
				const p1InRect =
					point1.x >= minX &&
					point1.x <= maxX &&
					point1.y >= minY &&
					point1.y <= maxY
				const p2InRect =
					point2.x >= minX &&
					point2.x <= maxX &&
					point2.y >= minY &&
					point2.y <= maxY
				if (p1InRect && p2InRect) {
					selectedIds.add(id)
				}
			}
		}

		// Check circles (select if center is in rectangle)
		for (const [id, circle] of geometry.circles) {
			const center = geometry.points.get(circle.centerId)
			if (
				center &&
				center.x >= minX &&
				center.x <= maxX &&
				center.y >= minY &&
				center.y <= maxY
			) {
				selectedIds.add(id)
			}
		}

		// Check labels (select if label position is in rectangle)
		for (const [id, label] of geometry.labels) {
			const position = calculateLabelPosition(label, geometry)
			if (!position) continue

			if (
				position.x >= minX &&
				position.x <= maxX &&
				position.y >= minY &&
				position.y <= maxY
			) {
				selectedIds.add(id)
			}
		}

		return selectedIds
	}

	private distanceToLineSegment(
		point: { x: number; y: number },
		lineStart: { x: number; y: number },
		lineEnd: { x: number; y: number }
	): number {
		const A = point.x - lineStart.x
		const B = point.y - lineStart.y
		const C = lineEnd.x - lineStart.x
		const D = lineEnd.y - lineStart.y

		const dot = A * C + B * D
		const lenSq = C * C + D * D

		if (lenSq === 0) return Math.sqrt(A * A + B * B)

		const param = dot / lenSq

		let closestX: number
		let closestY: number

		if (param < 0) {
			closestX = lineStart.x
			closestY = lineStart.y
		} else if (param > 1) {
			closestX = lineEnd.x
			closestY = lineEnd.y
		} else {
			closestX = lineStart.x + param * C
			closestY = lineStart.y + param * D
		}

		const dx = point.x - closestX
		const dy = point.y - closestY

		return Math.sqrt(dx * dx + dy * dy)
	}

	private handleMouseDown = (e: MouseEvent): void => {
		const mousePos = this.getMousePos(e)
		const worldPos = this.getWorldPos(mousePos.x, mousePos.y)
		const store = useStore.getState()

		this.isMouseDown = true

		switch (store.currentTool) {
			case "select":
				this.handleSelectMouseDown(worldPos, e.shiftKey, e.metaKey || e.ctrlKey)
				break
			case "point":
				this.handlePointMouseDown(worldPos)
				break
			case "line":
				this.handleLineMouseDown(worldPos)
				break
			case "circle":
				this.handleCircleMouseDown(worldPos, e)
				break
			case "label":
				this.handleLabelMouseDown(worldPos, e.shiftKey)
				break
		}
	}

	private handleMouseMove = (e: MouseEvent): void => {
		const mousePos = this.getMousePos(e)
		const worldPos = this.getWorldPos(mousePos.x, mousePos.y)
		const store = useStore.getState()

		// Update hover state
		const hoveredId = this.findEntityAt(worldPos.x, worldPos.y)
		if (hoveredId !== store.selection.hoveredId) {
			store.setSelection({ hoveredId })
		}

		if (this.isMouseDown) {
			this.handleMouseDrag(mousePos, worldPos)
		}

		this.currentMousePos = worldPos
	}

	private handleMouseUp = (): void => {
		if (!this.isMouseDown) return

		this.isMouseDown = false

		const store = useStore.getState()

		// Complete rectangular selection
		if (this.selectionRect) {
			this.selectionRect = null
		}

		store.setDragState(false)
	}

	private handleMouseLeave = (): void => {
		this.isMouseDown = false
		const store = useStore.getState()
		store.setSelection({ hoveredId: null })
		store.setDragState(false)

		// Reset temporary states when leaving canvas
		this.tempLineStart = null
		this.tempCircleCenter = null
		this.selectionRect = null
	}

	private handleContextMenu = (e: MouseEvent): void => {
		e.preventDefault()

		const mousePos = this.getMousePos(e)
		const worldPos = this.getWorldPos(mousePos.x, mousePos.y)
		const store = useStore.getState()

		// Only show context menu in select mode
		if (store.currentTool !== "select") {
			return
		}

		// Find entity at click position
		const entityId = this.findEntityAt(worldPos.x, worldPos.y)

		if (entityId) {
			// Select the clicked entity if not already selected
			const currentSelection = new Set(store.selection.selectedIds)
			if (!currentSelection.has(entityId)) {
				currentSelection.clear()
				currentSelection.add(entityId)
				store.setSelection({ selectedIds: currentSelection })
			}

			// Dispatch custom event to show context menu at screen coordinates
			const contextMenuEvent = new CustomEvent("showConstraintContextMenu", {
				detail: {
					x: e.clientX,
					y: e.clientY,
				},
			})
			window.dispatchEvent(contextMenuEvent)
		} else if (store.selection.selectedIds.size > 0) {
			// Right-click on empty space with selection - still show menu
			const contextMenuEvent = new CustomEvent("showConstraintContextMenu", {
				detail: {
					x: e.clientX,
					y: e.clientY,
				},
			})
			window.dispatchEvent(contextMenuEvent)
		}
	}

	private handleWheel = (e: WheelEvent): void => {
		e.preventDefault()
		const mousePos = this.getMousePos(e)
		const store = useStore.getState()

		// Distinguish between pinch-to-zoom and scroll-to-pan
		// ctrlKey is set during pinch gestures on trackpad
		if (e.ctrlKey) {
			// Pinch to zoom
			const zoomFactor = e.deltaY > 0 ? 0.94 : 1.06
			store.zoomViewport(zoomFactor, mousePos.x, mousePos.y)
		} else {
			// Two-finger scroll to pan
			const panSensitivity = 1.0
			const pixelsPerUnit = ViewportCalcs.pixelsPerUnit(store.viewport, store.geometry.scale)
			store.panViewport(
				(e.deltaX * panSensitivity) / pixelsPerUnit,
				(e.deltaY * panSensitivity) / pixelsPerUnit
			)
		}
	}

	private handleSelectMouseDown(
		worldPos: { x: number; y: number },
		shiftKey: boolean,
		cmdKey: boolean = false
	): void {
		const store = useStore.getState()

		// First, check if we're clicking on any entity (including radius points)
		const entityId = this.findEntityAt(worldPos.x, worldPos.y)

		// If we found an entity, handle it first (this includes radius points)
		if (entityId) {
			// Handle Cmd/Ctrl+Click for toggling point fixed state (including radius points)
			if (cmdKey && store.geometry.points.has(entityId)) {
				const point = store.geometry.points.get(entityId)
				if (!point) return

				const hasFixX = store.getFixXConstraint(entityId) !== null
				const hasFixY = store.getFixYConstraint(entityId) !== null

				if (hasFixX || hasFixY) {
					// Remove existing constraints
					if (hasFixX) store.removeFixXConstraint(entityId)
					if (hasFixY) store.removeFixYConstraint(entityId)
				} else {
					// Add both constraints at current position
					store.addFixXConstraint(entityId, point.x)
					store.addFixYConstraint(entityId, point.y)
				}
				return // Don't change selection when toggling fixed state
			}
		}

		if (entityId) {
			// Handle Cmd/Ctrl+Click for toggling line length fixed state
			if (cmdKey && store.geometry.lines.has(entityId)) {
				const line = store.geometry.lines.get(entityId)
				if (!line) return

				const point1 = store.geometry.points.get(line.point1Id)
				const point2 = store.geometry.points.get(line.point2Id)
				if (!point1 || !point2) return

				const existingConstraint = store.getLineLengthConstraint(entityId)

				if (existingConstraint) {
					// Remove existing length constraint
					store.removeLineLengthConstraint(entityId)
				} else {
					// Add length constraint with current length
					const currentLength = Math.sqrt(
						Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
					)
					store.addLineLengthConstraint(entityId, currentLength)
				}

				// Select the line
				store.setSelection({ selectedIds: new Set([entityId]) })
				return // Don't proceed with normal click handling
			}

			// Handle Cmd/Ctrl+Click for toggling circle radius constraint
			if (cmdKey && store.geometry.circles.has(entityId)) {
				const circle = store.geometry.circles.get(entityId)
				if (!circle) return

				const existingConstraint = Array.from(
					store.geometry.constraints.entries()
				).find(
					([, constraint]) =>
						constraint.type === "radius" &&
						constraint.entityIds.includes(entityId)
				)

				if (existingConstraint) {
					// Remove the constraint
					store.removeEntity(existingConstraint[0])
				} else {
					// Add a radius constraint
					const fixRadiusConstraint = {
						id: `constraint-${Date.now()}-${Math.random()
							.toString(36)
							.substr(2, 9)}`,
						type: "radius" as const,
						entityIds: [entityId],
						value: getCircleRadius(circle, store.geometry),
						priority: 1,
					}
					store.addConstraint(fixRadiusConstraint)
				}

				// Select the circle
				store.setSelection({ selectedIds: new Set([entityId]) })
				return
			}

			const selectedIds = new Set(store.selection.selectedIds)

			if (shiftKey) {
				if (selectedIds.has(entityId)) {
					selectedIds.delete(entityId)
				} else {
					selectedIds.add(entityId)
				}
			} else {
				// If clicking on an already selected entity, don't change the selection
				// This allows multi-entity dragging
				if (!selectedIds.has(entityId)) {
					selectedIds.clear()
					selectedIds.add(entityId)
				}
			}

			store.setSelection({ selectedIds })

			// Start dragging if any selected entities can be moved
			const hasMovableEntities = Array.from(selectedIds).some(
				(id) =>
					store.geometry.points.has(id) ||
					store.geometry.lines.has(id) ||
					store.geometry.labels.has(id)
			)

			if (hasMovableEntities) {
				store.setDragState(true, worldPos)
			}
		} else {
			// Start rectangular selection
			// Track whether shift was held for later use

			// If shift is not held, clear existing selection
			if (!shiftKey) {
				store.setSelection({ selectedIds: new Set() })
			}

			this.selectionRect = {
				startX: worldPos.x,
				startY: worldPos.y,
				endX: worldPos.x,
				endY: worldPos.y,
			}
		}
	}

	private handlePointMouseDown(worldPos: { x: number; y: number }): void {
		const store = useStore.getState()
		const point = createPoint(worldPos.x, worldPos.y)
		store.addPoint(point)
	}

	private handleLineMouseDown(worldPos: { x: number; y: number }): void {
		const store = useStore.getState()

		// Check if clicking on an existing point
		const existingPointId = this.findEntityAt(worldPos.x, worldPos.y)
		const existingPoint = existingPointId
			? store.geometry.points.get(existingPointId)
			: null

		if (!this.tempLineStart) {
			// First click - use existing point or create new point
			if (existingPoint) {
				this.tempLineStart = existingPoint
			} else {
				this.tempLineStart = createPoint(worldPos.x, worldPos.y)
				store.addPoint(this.tempLineStart)
			}
		} else {
			// Second click - use existing point or create new point, then create line
			let endPoint: Point
			if (existingPoint && existingPoint.id !== this.tempLineStart.id) {
				// Use existing point (but not the same as start point)
				endPoint = existingPoint
			} else {
				// Create new end point
				endPoint = createPoint(worldPos.x, worldPos.y)
				store.addPoint(endPoint)
			}

			const line = createLine(this.tempLineStart.id, endPoint.id)
			store.addLine(line)

			this.tempLineStart = null

			// Auto-revert to select tool after completing line
			store.setCurrentTool("select")
		}
	}

	private handleCircleMouseDown(
		worldPos: { x: number; y: number },
		e: MouseEvent
	): void {
		const store = useStore.getState()
		const cmdKey = e.metaKey || e.ctrlKey

		// Check if clicking on an existing point
		const existingPointId = this.findEntityAt(worldPos.x, worldPos.y)
		const existingPoint = existingPointId
			? store.geometry.points.get(existingPointId)
			: null

		if (!this.tempCircleCenter) {
			// First click - use existing point or create new point as center
			if (existingPoint) {
				this.tempCircleCenter = existingPoint
			} else {
				this.tempCircleCenter = createPoint(worldPos.x, worldPos.y)
				store.addPoint(this.tempCircleCenter)
			}
		} else {
			// Second click - create circle with radius from center to current position
			const radius = Math.sqrt(
				(worldPos.x - this.tempCircleCenter.x) ** 2 +
					(worldPos.y - this.tempCircleCenter.y) ** 2
			)

			// Ensure minimum radius
			const finalRadius = Math.max(1, radius)

			// Check if clicking on an existing point for radius point
			let radiusPointId: string
			if (existingPoint && existingPoint.id !== this.tempCircleCenter.id) {
				radiusPointId = existingPoint.id
			} else {
				// Create new radius point at the calculated position
				const angle = Math.atan2(
					worldPos.y - this.tempCircleCenter.y,
					worldPos.x - this.tempCircleCenter.x
				)
				const radiusPoint = createPoint(
					this.tempCircleCenter.x + finalRadius * Math.cos(angle),
					this.tempCircleCenter.y + finalRadius * Math.sin(angle)
				)
				store.addPoint(radiusPoint)
				radiusPointId = radiusPoint.id
			}

			// Create the circle directly
			const circle = {
				id: generateId(),
				centerId: this.tempCircleCenter.id,
				radiusPointId: radiusPointId,
			}
			store.addCircle(circle)

			// Add radius constraint if cmd key was held
			if (cmdKey) {
				const fixRadiusConstraint = {
					id: generateId(),
					type: "radius" as const,
					entityIds: [circle.id],
					value: finalRadius,
					priority: 1,
				}
				store.addConstraint(fixRadiusConstraint)
			}

			// Reset temporary state
			this.tempCircleCenter = null

			// Auto-revert to select tool after completing circle
			store.setCurrentTool("select")
		}
	}

	private handleLabelMouseDown(
		_worldPos: { x: number; y: number },
		_shiftKey: boolean
	): void {
		// Note: With improved label UX, labels are now created directly from the toolbar
		// when the label tool is clicked. This method should not be reached in normal usage,
		// but is kept for backwards compatibility.
		const store = useStore.getState()
		
		// Immediately revert to select tool since labels should be created via toolbar
		store.setCurrentTool("select")
	}

	private handleMouseDrag(
		_mousePos: { x: number; y: number },
		worldPos: { x: number; y: number }
	): void {
		const store = useStore.getState()

		if (
			store.currentTool === "select" &&
			store.isDragging &&
			store.dragStartPoint
		) {
			// Drag selected entities
			const dx = worldPos.x - store.dragStartPoint.x
			const dy = worldPos.y - store.dragStartPoint.y

			for (const entityId of store.selection.selectedIds) {
				// Move points directly
				const point = store.geometry.points.get(entityId)
				if (point) {
					store.updatePoint(entityId, {
						x: point.x + dx,
						y: point.y + dy,
					})
				}

				// Move labels by updating their offset
				const label = store.geometry.labels.get(entityId)
				if (label) {
					store.updateLabel(entityId, {
						offset: {
							x: label.offset.x + dx,
							y: label.offset.y + dy,
						},
					})
				}

				// Move lines by moving their endpoint points
				const line = store.geometry.lines.get(entityId)
				if (line) {
					const point1 = store.geometry.points.get(line.point1Id)
					const point2 = store.geometry.points.get(line.point2Id)

					if (point1) {
						store.updatePoint(line.point1Id, {
							x: point1.x + dx,
							y: point1.y + dy,
						})
					}

					if (point2) {
						store.updatePoint(line.point2Id, {
							x: point2.x + dx,
							y: point2.y + dy,
						})
					}
				}
			}

			store.setDragState(true, worldPos)
		} else if (store.currentTool === "select" && this.selectionRect) {
			// Update rectangular selection
			this.selectionRect.endX = worldPos.x
			this.selectionRect.endY = worldPos.y

			// Find entities within selection rectangle
			const selectedIds = this.getEntitiesInRect(this.selectionRect)
			store.setSelection({ selectedIds })
		}
	}

	destroy(): void {
		this.removeEventListeners()
	}

	// Expose temporary states for rendering
	getTempLineStart(): Point | null {
		return this.tempLineStart
	}

	getTempCircleCenter(): Point | null {
		return this.tempCircleCenter
	}

	getLinePreview(): {
		startPoint: Point
		endPoint: { x: number; y: number }
	} | null {
		if (this.tempLineStart) {
			return {
				startPoint: this.tempLineStart,
				endPoint: this.currentMousePos,
			}
		}
		return null
	}

	getCirclePreview(): {
		centerPoint: Point
		radiusPoint: { x: number; y: number }
	} | null {
		if (this.tempCircleCenter) {
			return {
				centerPoint: this.tempCircleCenter,
				radiusPoint: this.currentMousePos,
			}
		}
		return null
	}

	getSelectionRect(): {
		startX: number
		startY: number
		endX: number
		endY: number
	} | null {
		return this.selectionRect
	}
}
