import {
	Circle,
	Geometry,
	Label,
	Line,
	Point,
	SelectionState,
	Viewport,
} from "./engine/types"
import { getCircleRadius } from "./engine/geometry"
import {
	calculateLabelPosition,
	calculateLabelText,
	calculateDimensionLineEndpoints,
	calculateAngleArc
} from "./engine/label-positioning"

// Centralized color system to ensure consistent state handling
type EntityState = {
	isSelected: boolean
	isHovered: boolean
	isConstrained: boolean
	isConstraintHighlighted: boolean
}

class ColorSystem {
	static getEntityColors(state: EntityState): { color: string; width: number } {
		const { isSelected, isHovered, isConstrained, isConstraintHighlighted } = state

		// Constraint highlighting takes precedence (distinct orange/amber color)
		if (isConstraintHighlighted) {
			return {
				color: isSelected ? "#f59e0b" : isHovered ? "#fbbf24" : "#f59e0b",
				width: isSelected ? 4 : isHovered ? 3 : 3 // Always thick for constraint highlighting
			}
		} else if (isConstrained) {
			return {
				color: isSelected ? "#dc3545" : isHovered ? "#ff6b81" : "#c44569",
				width: isSelected ? 4 : isHovered ? 3 : 2
			}
		} else {
			return {
				color: isSelected ? "#4dabf7" : isHovered ? "#74c0fc" : "#6c757d",
				width: isSelected ? 3 : isHovered ? 2 : 1
			}
		}
	}

	static getLabelColors(state: { isSelected: boolean; isHovered: boolean }): { color: string; bgColor: string } {
		const { isSelected, isHovered } = state
		return {
			color: isSelected ? "#4dabf7" : isHovered ? "#74c0fc" : "#666",
			bgColor: isSelected ? "rgba(77, 171, 247, 0.2)" : isHovered ? "rgba(116, 192, 252, 0.2)" : "rgba(255, 255, 255, 0.9)"
		}
	}
}

export class CanvasRenderer {
	private ctx: CanvasRenderingContext2D
	private canvas: HTMLCanvasElement

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas
		this.ctx = canvas.getContext("2d")!
	}

	render(
		geometry: Geometry,
		viewport: Viewport,
		selection: SelectionState,
		interactionStates?: {
			tempLineStart?: Point | null
			tempCircleCenter?: Point | null
			selectionRect?: {
				startX: number
				startY: number
				endX: number
				endY: number
			} | null
			linePreview?: {
				startPoint: Point
				endPoint: { x: number; y: number }
			} | null
			circlePreview?: {
				centerPoint: Point
				radiusPoint: { x: number; y: number }
			} | null
		},
		selectedConstraintId?: string | null
	): void {
		this.clear()
		this.setupTransform(viewport)

		// Get constraint-highlighted entities
		const constraintHighlightedIds = this.getConstraintHighlightedIds(geometry, selectedConstraintId)

		this.renderGrid(viewport)
		this.renderLines(geometry, viewport, selection, constraintHighlightedIds)
		this.renderCircles(geometry, viewport, selection, constraintHighlightedIds)
		this.renderPoints(geometry, viewport, selection, constraintHighlightedIds)
		this.renderLabels(geometry, viewport, selection)
		this.renderConstraints()

		// Render interaction states
		if (interactionStates) {
			if (interactionStates.linePreview) {
				this.renderLinePreview(interactionStates.linePreview)
			}
			if (interactionStates.circlePreview) {
				this.renderCirclePreview(interactionStates.circlePreview)
			}
			if (interactionStates.selectionRect) {
				this.renderSelectionRect(interactionStates.selectionRect)
			}
		}

		// Legend now rendered by InteractiveLegend component
		// this.renderGridLegend(viewport)
	}

	private clear(): void {
		this.ctx.save()
		this.ctx.setTransform(1, 0, 0, 1, 0, 0)
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
		this.ctx.restore()
	}

	private setupTransform(viewport: Viewport): void {
		this.ctx.save()
		this.ctx.setTransform(1, 0, 0, 1, 0, 0)
		this.ctx.translate(viewport.width / 2, viewport.height / 2)
		this.ctx.scale(viewport.zoom, viewport.zoom)
		this.ctx.translate(-viewport.x, -viewport.y)
	}

	private renderGrid(viewport: Viewport): void {
		const primaryGridSize = this.calculateOptimalGridSize(viewport)

		// Render primary grid only
		this.renderGridLayer(viewport, primaryGridSize, '#e0e0e0', 0.5, 1)

		// Render axes (bold)
		this.renderAxes(viewport)
	}

	private calculateOptimalGridSize(viewport: Viewport): number {
		const targetPixelSpacing = 50 // Ideal pixel distance between grid lines
		const baseGridSize = targetPixelSpacing / viewport.zoom

		// Find the appropriate power of 10
		const logValue = Math.log10(baseGridSize)
		const roundedLog = Math.round(logValue)
		return Math.pow(10, roundedLog)
	}

	private renderGridLayer(
		viewport: Viewport,
		gridSize: number,
		strokeStyle: string,
		globalAlpha: number,
		lineWidth: number = 1
	): void {
		this.ctx.save()
		this.ctx.strokeStyle = strokeStyle
		this.ctx.lineWidth = lineWidth / viewport.zoom
		this.ctx.globalAlpha = globalAlpha

		const left = viewport.x - viewport.width / (2 * viewport.zoom)
		const right = viewport.x + viewport.width / (2 * viewport.zoom)
		const top = viewport.y - viewport.height / (2 * viewport.zoom)
		const bottom = viewport.y + viewport.height / (2 * viewport.zoom)

		// Vertical lines
		const startX = Math.floor(left / gridSize) * gridSize
		for (let x = startX; x <= right; x += gridSize) {
			// Skip lines that will be rendered as axes
			if (Math.abs(x) < gridSize / 1000) continue // Skip x=0 (Y-axis)

			this.ctx.beginPath()
			this.ctx.moveTo(x, top)
			this.ctx.lineTo(x, bottom)
			this.ctx.stroke()
		}

		// Horizontal lines
		const startY = Math.floor(top / gridSize) * gridSize
		for (let y = startY; y <= bottom; y += gridSize) {
			// Skip lines that will be rendered as axes
			if (Math.abs(y) < gridSize / 1000) continue // Skip y=0 (X-axis)

			this.ctx.beginPath()
			this.ctx.moveTo(left, y)
			this.ctx.lineTo(right, y)
			this.ctx.stroke()
		}

		this.ctx.restore()
	}

	private renderAxes(viewport: Viewport): void {
		const left = viewport.x - viewport.width / (2 * viewport.zoom)
		const right = viewport.x + viewport.width / (2 * viewport.zoom)
		const top = viewport.y - viewport.height / (2 * viewport.zoom)
		const bottom = viewport.y + viewport.height / (2 * viewport.zoom)

		this.ctx.save()
		this.ctx.strokeStyle = '#999999'
		this.ctx.lineWidth = 2 / viewport.zoom // Slightly thicker
		this.ctx.globalAlpha = 0.8 // More opaque

		// Y-axis (vertical line at x=0) - only render if visible
		if (left <= 0 && right >= 0) {
			this.ctx.beginPath()
			this.ctx.moveTo(0, top)
			this.ctx.lineTo(0, bottom)
			this.ctx.stroke()
		}

		// X-axis (horizontal line at y=0) - only render if visible
		if (top <= 0 && bottom >= 0) {
			this.ctx.beginPath()
			this.ctx.moveTo(left, 0)
			this.ctx.lineTo(right, 0)
			this.ctx.stroke()
		}

		this.ctx.restore()
	}

	private renderPoints(geometry: Geometry, viewport: Viewport, selection: SelectionState, constraintHighlightedIds: Set<string>): void {
		geometry.points.forEach((point) => {
			this.renderPoint(point, viewport, selection, geometry, constraintHighlightedIds)
		})
	}

	private renderPoint(
		point: Point,
		viewport: Viewport,
		selection: SelectionState,
		geometry: Geometry,
		constraintHighlightedIds: Set<string>
	): void {
		const isSelected = selection.selectedIds.has(point.id)
		const isHovered = selection.hoveredId === point.id
		const isConstraintHighlighted = constraintHighlightedIds.has(point.id)

		// Check for fix constraints
		const hasFixX = this.hasFixXConstraint(point.id, geometry)
		const hasFixY = this.hasFixYConstraint(point.id, geometry)
		const isFixed = hasFixX || hasFixY
		const isFullyFixed = hasFixX && hasFixY

		this.ctx.save()

		// Point circle - scale with displayScale
		this.ctx.beginPath()
		const baseRadius = isFixed ? 5 : 4 // Fixed points are slightly larger
		const scaledRadius = baseRadius * (viewport.displayScale / 100)
		const radius = scaledRadius / viewport.zoom
		this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI)

		// Use ColorSystem for consistent color handling
		if (isConstraintHighlighted) {
			this.ctx.fillStyle = isSelected
				? "#f59e0b"
				: isHovered
					? "#fbbf24"
					: "#f59e0b"
		} else if (isFixed) {
			this.ctx.fillStyle = isSelected
				? "#ff4757"
				: isHovered
					? "#ff6b81"
					: "#e74c3c"
		} else {
			this.ctx.fillStyle = isSelected
				? "#4dabf7"
				: isHovered
					? "#74c0fc"
					: "#339af0"
		}

		this.ctx.fill()

		// Fixed points get a distinctive border
		if (isFixed) {
			this.ctx.strokeStyle = isConstraintHighlighted
				? "#d97706"
				: "#c44569"
			const borderWidth = 2 * (viewport.displayScale / 100)
			this.ctx.lineWidth = borderWidth / viewport.zoom
			this.ctx.stroke()

			// Show partial fixing with partial border
			if (!isFullyFixed) {
				this.ctx.beginPath()
				if (hasFixX && !hasFixY) {
					// Show horizontal line for Y-fixed
					this.ctx.moveTo(point.x, point.y - radius)
					this.ctx.lineTo(point.x, point.y + radius)
				} else if (!hasFixX && hasFixY) {
					// Show vertical line for X-fixed
					this.ctx.moveTo(point.x - radius, point.y)
					this.ctx.lineTo(point.x + radius, point.y)
				}
				this.ctx.strokeStyle = "#ffffff"
				const crossWidth = 2 * (viewport.displayScale / 100)
				this.ctx.lineWidth = crossWidth / viewport.zoom
				this.ctx.stroke()
			}
		}

		// Selection ring or constraint highlight ring
		if (isSelected || isHovered || isConstraintHighlighted) {
			this.ctx.beginPath()
			const ringOffset = 2 * (viewport.displayScale / 100) / viewport.zoom
			this.ctx.arc(point.x, point.y, radius + ringOffset, 0, 2 * Math.PI)
			
			if (isConstraintHighlighted) {
				this.ctx.strokeStyle = isSelected
					? "#d97706"
					: isHovered
						? "#f59e0b"
						: "#d97706"
			} else if (isFixed) {
				this.ctx.strokeStyle = isSelected
					? "#c44569"
					: "#ff6b81"
			} else {
				this.ctx.strokeStyle = isSelected
					? "#1971c2"
					: "#74c0fc"
			}
			
			const ringWidth = isConstraintHighlighted ? 3 : 2 // Thicker ring for constraint highlighting
			const scaledRingWidth = ringWidth * (viewport.displayScale / 100)
			this.ctx.lineWidth = scaledRingWidth / viewport.zoom
			this.ctx.stroke()
		}

		this.ctx.restore()
	}

	private renderLines(geometry: Geometry, viewport: Viewport, selection: SelectionState, constraintHighlightedIds: Set<string>): void {
		geometry.lines.forEach((line) => {
			this.renderLine(line, geometry, viewport, selection, constraintHighlightedIds)
		})
	}

	private renderLine(
		line: Line,
		geometry: Geometry,
		viewport: Viewport,
		selection: SelectionState,
		constraintHighlightedIds: Set<string>
	): void {
		const point1 = geometry.points.get(line.point1Id)
		const point2 = geometry.points.get(line.point2Id)

		if (!point1 || !point2) return

		const isSelected = selection.selectedIds.has(line.id)
		const isHovered = selection.hoveredId === line.id
		const isConstraintHighlighted = constraintHighlightedIds.has(line.id)
		const hasLengthConstraint = geometry.constraints.has(
			`line-length-${line.id}`
		)

		this.ctx.save()

		// Use ColorSystem for consistent color handling
		const colors = ColorSystem.getEntityColors({
			isSelected,
			isHovered, 
			isConstrained: hasLengthConstraint,
			isConstraintHighlighted
		})
		
		this.ctx.strokeStyle = colors.color
		const scaledWidth = colors.width * (viewport.displayScale / 100)
		this.ctx.lineWidth = scaledWidth / viewport.zoom

		this.ctx.beginPath()

		if (line.infinite) {
			// Extend line to canvas bounds
			const dx = point2.x - point1.x
			const dy = point2.y - point1.y
			const length = Math.sqrt(dx * dx + dy * dy)

			if (length > 0) {
				const dirX = dx / length
				const dirY = dy / length
				const extension = 10000 // Large extension

				this.ctx.moveTo(
					point1.x - dirX * extension,
					point1.y - dirY * extension
				)
				this.ctx.lineTo(
					point2.x + dirX * extension,
					point2.y + dirY * extension
				)
			}
		} else {
			this.ctx.moveTo(point1.x, point1.y)
			this.ctx.lineTo(point2.x, point2.y)
		}

		this.ctx.stroke()
		this.ctx.restore()
	}

	private renderCircles(geometry: Geometry, viewport: Viewport, selection: SelectionState, constraintHighlightedIds: Set<string>): void {
		geometry.circles.forEach((circle) => {
			this.renderCircle(circle, geometry, viewport, selection, constraintHighlightedIds)
		})
	}

	private renderCircle(
		circle: Circle,
		geometry: Geometry,
		viewport: Viewport,
		selection: SelectionState,
		constraintHighlightedIds: Set<string>
	): void {
		const center = geometry.points.get(circle.centerId)
		if (!center) return

		const isSelected = selection.selectedIds.has(circle.id)
		const isHovered = selection.hoveredId === circle.id
		const isConstraintHighlighted = constraintHighlightedIds.has(circle.id)

		// Check if radius is fixed
		const hasFixRadius = Array.from(geometry.constraints.entries()).some(
			([, constraint]) =>
				constraint.type === "radius" && constraint.entityIds.includes(circle.id)
		)

		this.ctx.save()

		// Use centralized color system for consistent state handling
		const colors = ColorSystem.getEntityColors({
			isSelected,
			isHovered, 
			isConstrained: hasFixRadius,
			isConstraintHighlighted
		})
		
		this.ctx.strokeStyle = colors.color
		const scaledWidth = colors.width * (viewport.displayScale / 100)
		this.ctx.lineWidth = scaledWidth / viewport.zoom

		this.ctx.fillStyle = "transparent"

		const radius = getCircleRadius(circle, geometry)
		this.ctx.beginPath()
		this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
		this.ctx.stroke()

		this.ctx.restore()
	}

	private renderLabels(geometry: Geometry, viewport: Viewport, selection: SelectionState): void {
		geometry.labels.forEach((label) => {
			if (label.visible) {
				this.renderLabel(label, geometry, viewport, selection)
			}
		})
	}

	private renderLabel(
		label: Label,
		geometry: Geometry,
		viewport: Viewport,
		selection: SelectionState
	): void {
		const position = calculateLabelPosition(label, geometry)
		const text = calculateLabelText(label, geometry)
		
		if (!position || !text) return

		const isSelected = selection.selectedIds.has(label.id)
		const isHovered = selection.hoveredId === label.id

		this.ctx.save()

		// Render leader lines if label is moved far from entity
		this.renderLeaderLine(label, geometry, position, viewport, isSelected, isHovered)

		// Render dimension lines for distance labels
		if (label.type === "distance") {
			const [point1Id, point2Id] = label.entityIds
			const p1 = geometry.points.get(point1Id)
			const p2 = geometry.points.get(point2Id)
			if (p1 && p2) {
				this.renderDimensionLine(p1, p2, position, viewport, isSelected, isHovered)
			}
		}

		// Render angle arc for angle labels
		if (label.type === "angle") {
			const [point1Id, vertexId, point2Id] = label.entityIds
			const p1 = geometry.points.get(point1Id)
			const vertex = geometry.points.get(vertexId)
			const p2 = geometry.points.get(point2Id)
			if (p1 && vertex && p2) {
				this.renderAngleArc(p1, vertex, p2, viewport, isSelected, isHovered)
			}
		}

		// Render label text with background
		this.renderLabelText(text, position, viewport, isSelected, isHovered)

		this.ctx.restore()
	}

	private renderDimensionLine(
		p1: Point,
		p2: Point,
		labelPosition: { x: number; y: number },
		viewport: Viewport,
		isSelected: boolean,
		isHovered: boolean
	): void {
		const { start, end, extensionLines } = calculateDimensionLineEndpoints(p1, p2, labelPosition)
		
		const color = isSelected ? "#4dabf7" : isHovered ? "#74c0fc" : "#666"
		const baseWidth = isSelected ? 2 : 1
		const scaledWidth = baseWidth * (viewport.displayScale / 100)

		this.ctx.strokeStyle = color
		this.ctx.lineWidth = scaledWidth / viewport.zoom

		// Draw extension lines
		this.ctx.beginPath()
		this.ctx.moveTo(extensionLines.p1Start.x, extensionLines.p1Start.y)
		this.ctx.lineTo(extensionLines.p1End.x, extensionLines.p1End.y)
		this.ctx.moveTo(extensionLines.p2Start.x, extensionLines.p2Start.y)
		this.ctx.lineTo(extensionLines.p2End.x, extensionLines.p2End.y)
		this.ctx.stroke()

		// Draw main dimension line
		this.ctx.beginPath()
		this.ctx.moveTo(start.x, start.y)
		this.ctx.lineTo(end.x, end.y)
		this.ctx.stroke()

		// Draw arrowheads/ticks at ends
		this.renderDimensionArrows(start, end, color, scaledWidth, viewport)
	}

	private renderDimensionArrows(
		start: { x: number; y: number },
		end: { x: number; y: number },
		color: string,
		scaledWidth: number,
		viewport: Viewport
	): void {
		const baseArrowSize = 5
		const arrowSize = (baseArrowSize * (viewport.displayScale / 100)) / viewport.zoom
		
		// Calculate direction vector
		const dx = end.x - start.x
		const dy = end.y - start.y
		const length = Math.sqrt(dx * dx + dy * dy)
		
		if (length === 0) return
		
		const unitX = dx / length
		const unitY = dy / length
		const perpX = -unitY
		const perpY = unitX

		this.ctx.fillStyle = color
		this.ctx.strokeStyle = color
		this.ctx.lineWidth = scaledWidth / viewport.zoom

		// Start arrow
		this.ctx.beginPath()
		this.ctx.moveTo(start.x, start.y)
		this.ctx.lineTo(start.x + unitX * arrowSize + perpX * arrowSize/2, start.y + unitY * arrowSize + perpY * arrowSize/2)
		this.ctx.lineTo(start.x + unitX * arrowSize - perpX * arrowSize/2, start.y + unitY * arrowSize - perpY * arrowSize/2)
		this.ctx.closePath()
		this.ctx.fill()

		// End arrow
		this.ctx.beginPath()
		this.ctx.moveTo(end.x, end.y)
		this.ctx.lineTo(end.x - unitX * arrowSize + perpX * arrowSize/2, end.y - unitY * arrowSize + perpY * arrowSize/2)
		this.ctx.lineTo(end.x - unitX * arrowSize - perpX * arrowSize/2, end.y - unitY * arrowSize - perpY * arrowSize/2)
		this.ctx.closePath()
		this.ctx.fill()
	}

	private renderAngleArc(
		p1: Point,
		vertex: Point,
		p2: Point,
		viewport: Viewport,
		isSelected: boolean,
		isHovered: boolean
	): void {
		const { centerX, centerY, radius, startAngle, endAngle } = calculateAngleArc(p1, vertex, p2)
		
		const color = isSelected ? "#4dabf7" : isHovered ? "#74c0fc" : "#666"
		const baseWidth = isSelected ? 2 : 1
		const scaledWidth = baseWidth * (viewport.displayScale / 100)

		this.ctx.strokeStyle = color
		this.ctx.lineWidth = scaledWidth / viewport.zoom
		this.ctx.fillStyle = "transparent"

		// Draw arc
		this.ctx.beginPath()
		this.ctx.arc(centerX, centerY, radius, startAngle, endAngle)
		this.ctx.stroke()
	}

	private renderLabelText(
		text: string,
		position: { x: number; y: number },
		viewport: Viewport,
		isSelected: boolean,
		isHovered: boolean
	): void {
		// Calculate text dimensions for background
		const baseFontSize = 12
		const scaledFontSize = baseFontSize * (viewport.displayScale / 100)
		this.ctx.font = `${scaledFontSize / viewport.zoom}px Arial`
		this.ctx.textAlign = "center"
		this.ctx.textBaseline = "middle"
		
		const textMetrics = this.ctx.measureText(text)
		const textWidth = textMetrics.width
		const textHeight = scaledFontSize / viewport.zoom * 1.2 // Font height with some spacing
		
		const basePadding = 4
		const padding = (basePadding * (viewport.displayScale / 100)) / viewport.zoom
		const bgWidth = textWidth + padding * 2
		const bgHeight = textHeight + padding * 2

		// Draw background
		this.ctx.fillStyle = isSelected 
			? "rgba(77, 171, 247, 0.2)" 
			: isHovered 
				? "rgba(116, 192, 252, 0.2)" 
				: "rgba(255, 255, 255, 0.9)"
		
		this.ctx.fillRect(
			position.x - bgWidth / 2,
			position.y - bgHeight / 2,
			bgWidth,
			bgHeight
		)

		// Draw border
		this.ctx.strokeStyle = isSelected ? "#4dabf7" : isHovered ? "#74c0fc" : "#ccc"
		const baseBorderWidth = isSelected ? 2 : 1
		const scaledBorderWidth = baseBorderWidth * (viewport.displayScale / 100)
		this.ctx.lineWidth = scaledBorderWidth / viewport.zoom
		this.ctx.strokeRect(
			position.x - bgWidth / 2,
			position.y - bgHeight / 2,
			bgWidth,
			bgHeight
		)

		// Draw text
		this.ctx.fillStyle = "#333"
		this.ctx.fillText(text, position.x, position.y)
	}

	private renderLeaderLine(
		label: Label,
		geometry: Geometry,
		labelPosition: { x: number; y: number },
		viewport: Viewport,
		isSelected: boolean,
		isHovered: boolean
	): void {
		// Distance labels don't need leader lines - they have dimension lines
		if (label.type === "distance") return

		// Calculate the base position (where label would be without user offset)
		const basePosition = this.calculateBasePosition(label, geometry)
		if (!basePosition) return

		// Calculate distance between label and its base position
		const distanceFromBase = Math.sqrt(
			(labelPosition.x - basePosition.x) ** 2 + 
			(labelPosition.y - basePosition.y) ** 2
		)

		// Only show leader line if label is moved far enough (threshold: 30 pixels)
		const leaderThreshold = 30
		if (distanceFromBase < leaderThreshold) return

		// Get the target point to point leader line to
		const targetPoint = this.getLeaderTarget(label, geometry)
		if (!targetPoint) return

		// Draw leader line from target to label
		this.ctx.strokeStyle = isSelected 
			? "#4dabf7" 
			: isHovered 
				? "#74c0fc" 
				: "rgba(0, 0, 0, 0.4)"
		const baseWidth = isSelected ? 2 : 1
		const scaledWidth = baseWidth * (viewport.displayScale / 100)
		this.ctx.lineWidth = scaledWidth / viewport.zoom
		const dashSize = (3 * (viewport.displayScale / 100)) / viewport.zoom
		this.ctx.setLineDash([dashSize, dashSize]) // Dashed line

		this.ctx.beginPath()
		this.ctx.moveTo(targetPoint.x, targetPoint.y)
		this.ctx.lineTo(labelPosition.x, labelPosition.y)
		this.ctx.stroke()
		
		// Draw arrowhead at the target end of the line
		this.drawArrowhead(targetPoint, labelPosition, viewport, isSelected, isHovered)
		
		// Reset line dash
		this.ctx.setLineDash([])
	}

	private calculateBasePosition(label: Label, geometry: Geometry): { x: number; y: number } | null {
		// Calculate where the label would be positioned without user offset
		switch (label.type) {
			case "coordinate": {
				const [pointId] = label.entityIds
				const point = geometry.points.get(pointId)
				if (!point) return null
				return { x: point.x + 15, y: point.y - 15 } // Default offset
			}
			case "distance": {
				const [point1Id, point2Id] = label.entityIds
				const p1 = geometry.points.get(point1Id)
				const p2 = geometry.points.get(point2Id)
				if (!p1 || !p2) return null
				return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } // Midpoint
			}
			case "angle": {
				const [, vertexId] = label.entityIds
				const vertex = geometry.points.get(vertexId)
				if (!vertex) return null
				return { x: vertex.x + 25, y: vertex.y - 25 } // Near vertex
			}
		}
		return null
	}

	private getLeaderTarget(label: Label, geometry: Geometry): { x: number; y: number } | null {
		// Get the specific point to point the leader line to
		switch (label.type) {
			case "coordinate": {
				const [pointId] = label.entityIds
				const point = geometry.points.get(pointId)
				return point ? { x: point.x, y: point.y } : null
			}
			case "distance": {
				const [point1Id, point2Id] = label.entityIds
				const p1 = geometry.points.get(point1Id)
				const p2 = geometry.points.get(point2Id)
				if (!p1 || !p2) return null
				return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } // Line midpoint
			}
			case "angle": {
				const [point1Id, vertexId, point2Id] = label.entityIds
				const p1 = geometry.points.get(point1Id)
				const vertex = geometry.points.get(vertexId)
				const p2 = geometry.points.get(point2Id)
				if (!p1 || !vertex || !p2) return null
				
				// Calculate the arc and point to its midpoint
				const { centerX, centerY, radius, startAngle, endAngle } = calculateAngleArc(p1, vertex, p2)
				const midAngle = (startAngle + endAngle) / 2
				
				return {
					x: centerX + radius * Math.cos(midAngle),
					y: centerY + radius * Math.sin(midAngle)
				}
			}
		}
		return null
	}

	private drawArrowhead(
		targetPoint: { x: number; y: number },
		labelPoint: { x: number; y: number },
		viewport: Viewport,
		isSelected: boolean,
		isHovered: boolean
	): void {
		const baseArrowLength = 8
		const baseArrowWidth = 4
		const arrowLength = (baseArrowLength * (viewport.displayScale / 100)) / viewport.zoom
		const arrowWidth = (baseArrowWidth * (viewport.displayScale / 100)) / viewport.zoom

		// Calculate direction vector from target to label
		const dx = labelPoint.x - targetPoint.x
		const dy = labelPoint.y - targetPoint.y
		const length = Math.sqrt(dx * dx + dy * dy)
		
		if (length < 0.1) return // Avoid division by zero
		
		// Normalize direction vector (pointing from target toward label)
		const unitX = dx / length
		const unitY = dy / length
		
		// Arrowhead tip is at the target point
		const arrowTipX = targetPoint.x
		const arrowTipY = targetPoint.y
		
		// Calculate perpendicular vector
		const perpX = -unitY
		const perpY = unitX
		
		// Calculate arrowhead base points
		const leftX = arrowTipX + unitX * arrowLength + perpX * arrowWidth
		const leftY = arrowTipY + unitY * arrowLength + perpY * arrowWidth
		const rightX = arrowTipX + unitX * arrowLength - perpX * arrowWidth
		const rightY = arrowTipY + unitY * arrowLength - perpY * arrowWidth
		
		// Draw filled arrowhead pointing toward target
		this.ctx.fillStyle = isSelected 
			? "#4dabf7" 
			: isHovered 
				? "#74c0fc" 
				: "rgba(0, 0, 0, 0.4)"
		
		this.ctx.beginPath()
		this.ctx.moveTo(arrowTipX, arrowTipY)
		this.ctx.lineTo(leftX, leftY)
		this.ctx.lineTo(rightX, rightY)
		this.ctx.closePath()
		this.ctx.fill()
	}

	private renderConstraints(): void {
		// TODO: Render constraint indicators (small icons, dimension lines, etc.)
		// For now, we'll skip this and add it later
	}

	// Removed - now handled by InteractiveLegend component

	// Moved to InteractiveLegend component

	resize(width: number, height: number): void {
		this.canvas.width = width
		this.canvas.height = height
	}

	getCanvas(): HTMLCanvasElement {
		return this.canvas
	}

	getContext(): CanvasRenderingContext2D {
		return this.ctx
	}

	private renderLinePreview(linePreview: {
		startPoint: Point
		endPoint: { x: number; y: number }
	}): void {
		this.ctx.save()

		// Draw preview line with dashed style
		this.ctx.strokeStyle = "#666666"
		this.ctx.lineWidth = 2 / this.ctx.getTransform().a // Scale line width with zoom
		this.ctx.setLineDash([
			8 / this.ctx.getTransform().a,
			4 / this.ctx.getTransform().a,
		])
		this.ctx.globalAlpha = 0.7

		this.ctx.beginPath()
		this.ctx.moveTo(linePreview.startPoint.x, linePreview.startPoint.y)
		this.ctx.lineTo(linePreview.endPoint.x, linePreview.endPoint.y)
		this.ctx.stroke()

		this.ctx.restore()
	}

	private renderCirclePreview(circlePreview: {
		centerPoint: Point
		radiusPoint: { x: number; y: number }
	}): void {
		this.ctx.save()

		// Calculate radius
		const radius = Math.sqrt(
			(circlePreview.radiusPoint.x - circlePreview.centerPoint.x) ** 2 +
			(circlePreview.radiusPoint.y - circlePreview.centerPoint.y) ** 2
		)

		// Draw preview circle with dashed style
		this.ctx.strokeStyle = "#666666"
		this.ctx.lineWidth = 2 / this.ctx.getTransform().a // Scale line width with zoom
		this.ctx.setLineDash([
			8 / this.ctx.getTransform().a,
			4 / this.ctx.getTransform().a,
		])
		this.ctx.globalAlpha = 0.7

		this.ctx.beginPath()
		this.ctx.arc(circlePreview.centerPoint.x, circlePreview.centerPoint.y, radius, 0, 2 * Math.PI)
		this.ctx.stroke()

		this.ctx.restore()
	}

	private renderSelectionRect(rect: {
		startX: number
		startY: number
		endX: number
		endY: number
	}): void {
		this.ctx.save()

		// Draw selection rectangle with dashed border
		this.ctx.strokeStyle = "#2196f3"
		this.ctx.lineWidth = 1.5 / this.ctx.getTransform().a // Scale line width with zoom
		this.ctx.setLineDash([
			5 / this.ctx.getTransform().a,
			3 / this.ctx.getTransform().a,
		])
		this.ctx.fillStyle = "rgba(33, 150, 243, 0.1)"

		const width = rect.endX - rect.startX
		const height = rect.endY - rect.startY

		// Fill rectangle
		this.ctx.fillRect(rect.startX, rect.startY, width, height)

		// Stroke rectangle
		this.ctx.strokeRect(rect.startX, rect.startY, width, height)

		this.ctx.restore()
	}

	private hasFixXConstraint(pointId: string, geometry: Geometry): boolean {
		const constraintId = `x-${pointId}`
		return geometry.constraints.has(constraintId)
	}

	private hasFixYConstraint(pointId: string, geometry: Geometry): boolean {
		const constraintId = `y-${pointId}`
		return geometry.constraints.has(constraintId)
	}

	private getConstraintHighlightedIds(geometry: Geometry, selectedConstraintId: string | null | undefined): Set<string> {
		const highlightedIds = new Set<string>()
		
		if (!selectedConstraintId || !geometry) {
			return highlightedIds
		}

		const constraint = geometry.constraints.get(selectedConstraintId)
		if (constraint) {
			// Add all entity IDs from the constraint to the highlighted set
			constraint.entityIds.forEach(id => highlightedIds.add(id))
		}

		return highlightedIds
	}
}
