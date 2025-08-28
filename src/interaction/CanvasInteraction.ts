import { createCircle, createLine, createPoint } from "../engine/geometry"
import { Point } from "../engine/types"
import { useStore } from "../store"

export class CanvasInteraction {
	private canvas: HTMLCanvasElement
	private isMouseDown = false
	private currentMousePos = { x: 0, y: 0 }
	private tempLineStart: Point | null = null
	private tempCircleCenter: Point | null = null
	private circleRadiusDrag: { circleId: string; initialRadius: number } | null =
		null
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
		const tolerance = 10 / store.viewport.zoom // Scale tolerance with zoom

		// Check points first (highest priority for selection)
		for (const [id, point] of geometry.points) {
			const dist = Math.sqrt((point.x - worldX) ** 2 + (point.y - worldY) ** 2)
			if (dist <= tolerance) {
				return id
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
				return id
			}
		}

		// Check circles
		for (const [id, circle] of geometry.circles) {
			const center = geometry.points.get(circle.centerId)
			if (!center) continue

			const distToCenter = Math.sqrt(
				(center.x - worldX) ** 2 + (center.y - worldY) ** 2
			)
			const distToCircle = Math.abs(distToCenter - circle.radius)

			if (distToCircle <= tolerance) {
				return id
			}
		}

		return null
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

	private findCircleRadiusDragTarget(
		worldX: number,
		worldY: number
	): string | null {
		const store = useStore.getState()
		const { geometry } = store
		const tolerance = 15 / store.viewport.zoom // Slightly larger tolerance for radius drag

		for (const [id, circle] of geometry.circles) {
			const center = geometry.points.get(circle.centerId)
			if (!center) continue

			const distToCenter = Math.sqrt(
				(center.x - worldX) ** 2 + (center.y - worldY) ** 2
			)
			const distToCircle = Math.abs(distToCenter - circle.radius)

			// Check if clicking near the circle edge (not the center)
			if (distToCircle <= tolerance && distToCenter > tolerance) {
				return id
			}
		}

		return null
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

		// Handle circle tool completion
		if (
			store.currentTool === "circle" &&
			this.circleRadiusDrag &&
			this.tempCircleCenter
		) {
			// If cmd key was held during mousedown, add radius constraint
			if ((this.circleRadiusDrag as any).shouldFixRadius) {
				const circle = store.geometry.circles.get(
					this.circleRadiusDrag.circleId
				)
				if (circle) {
					const fixRadiusConstraint = {
						id: `constraint-${Date.now()}-${Math.random()
							.toString(36)
							.substr(2, 9)}`,
						type: "radius" as const,
						entityIds: [circle.id],
						value: circle.radius,
						priority: 1,
					}
					store.addConstraint(fixRadiusConstraint)
				}
			}

			// Reset temporary states
			this.tempCircleCenter = null
			this.circleRadiusDrag = null

			// Auto-revert to select tool after completing circle
			store.setCurrentTool("select")
		}

		// Reset circle radius drag state for select tool
		if (store.currentTool === "select") {
			this.circleRadiusDrag = null
		}

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
		this.circleRadiusDrag = null
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
			// Pinch to zoom with reduced sensitivity
			const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05
			store.zoomViewport(zoomFactor, mousePos.x, mousePos.y)
		} else {
			// Two-finger scroll to pan
			const panSensitivity = 1.0
			store.panViewport(
				(e.deltaX * panSensitivity) / store.viewport.zoom,
				(e.deltaY * panSensitivity) / store.viewport.zoom
			)
		}
	}

	private handleSelectMouseDown(
		worldPos: { x: number; y: number },
		shiftKey: boolean,
		cmdKey: boolean = false
	): void {
		const store = useStore.getState()

		// Check for circle radius drag first
		const circleRadiusTarget = this.findCircleRadiusDragTarget(
			worldPos.x,
			worldPos.y
		)
		if (circleRadiusTarget && !shiftKey) {
			const circle = store.geometry.circles.get(circleRadiusTarget)
			if (circle) {
				if (cmdKey) {
					// Cmd+click on circle radius to toggle fixed state
					const existingConstraint = Array.from(
						store.geometry.constraints.entries()
					).find(
						([, constraint]) =>
							constraint.type === "radius" &&
							constraint.entityIds.includes(circleRadiusTarget)
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
							entityIds: [circleRadiusTarget],
							value: circle.radius,
							priority: 1,
						}
						store.addConstraint(fixRadiusConstraint)
					}

					// Select the circle
					store.setSelection({ selectedIds: new Set([circleRadiusTarget]) })
					return
				} else {
					// Set up circle radius dragging
					this.circleRadiusDrag = {
						circleId: circleRadiusTarget,
						initialRadius: circle.radius,
					}

					// Select the circle
					store.setSelection({ selectedIds: new Set([circleRadiusTarget]) })
					return
				}
			}
		}

		const entityId = this.findEntityAt(worldPos.x, worldPos.y)

		if (entityId) {
			// Handle Cmd/Ctrl+Click for toggling point fixed state
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
					store.geometry.circles.has(id) ||
					store.geometry.lines.has(id)
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

			const line = createLine(this.tempLineStart.id, endPoint.id, false)
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

		if (existingPoint) {
			// Use existing point as center
			this.tempCircleCenter = existingPoint

			// Set up for potential dragging to define radius
			this.circleRadiusDrag = {
				circleId: "", // Will be set when circle is created
				initialRadius: 50 / store.viewport.zoom,
			}
		} else {
			// Create new center point
			const centerPoint = createPoint(worldPos.x, worldPos.y)
			store.addPoint(centerPoint)
			this.tempCircleCenter = centerPoint

			// Set up for potential dragging to define radius
			this.circleRadiusDrag = {
				circleId: "", // Will be set when circle is created
				initialRadius: 50 / store.viewport.zoom,
			}
		}

		// Create initial circle with default radius
		const defaultRadius = 50 / store.viewport.zoom
		const circle = createCircle(this.tempCircleCenter.id, defaultRadius)
		store.addCircle(circle)
		this.circleRadiusDrag!.circleId = circle.id

		// Store initial state for potential radius fixing
		if (cmdKey) {
			// Mark that we want to fix radius after creation
			;(this.circleRadiusDrag as any).shouldFixRadius = true
		}
	}

	private handleMouseDrag(
		_mousePos: { x: number; y: number },
		worldPos: { x: number; y: number }
	): void {
		const store = useStore.getState()

		// Handle circle radius dragging (both for select tool and circle tool)
		if (
			this.circleRadiusDrag &&
			(store.currentTool === "select" || store.currentTool === "circle")
		) {
			const circle = store.geometry.circles.get(this.circleRadiusDrag.circleId)
			const center = circle ? store.geometry.points.get(circle.centerId) : null

			if (circle && center) {
				// Calculate new radius as distance from center to mouse
				const newRadius = Math.sqrt(
					(worldPos.x - center.x) ** 2 + (worldPos.y - center.y) ** 2
				)

				// Update circle radius (minimum radius of 1)
				store.updateCircle(this.circleRadiusDrag.circleId, {
					radius: Math.max(1, newRadius),
				})
			}
			return
		}

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

				// Move circles by moving their center points
				const circle = store.geometry.circles.get(entityId)
				if (circle) {
					const centerPoint = store.geometry.points.get(circle.centerId)
					if (centerPoint) {
						store.updatePoint(circle.centerId, {
							x: centerPoint.x + dx,
							y: centerPoint.y + dy,
						})
					}
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

	getSelectionRect(): {
		startX: number
		startY: number
		endX: number
		endY: number
	} | null {
		return this.selectionRect
	}
}
