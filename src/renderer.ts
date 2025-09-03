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
		}
	): void {
		this.clear()
		this.setupTransform(viewport)

		this.renderGrid(viewport)
		this.renderLines(geometry, selection)
		this.renderCircles(geometry, selection)
		this.renderPoints(geometry, selection)
		this.renderLabels(geometry, selection)
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

		this.renderGridLegend(viewport)
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

	private renderPoints(geometry: Geometry, selection: SelectionState): void {
		geometry.points.forEach((point) => {
			this.renderPoint(point, selection, geometry)
		})
	}

	private renderPoint(
		point: Point,
		selection: SelectionState,
		geometry: Geometry
	): void {
		const isSelected = selection.selectedIds.has(point.id)
		const isHovered = selection.hoveredId === point.id

		// Check for fix constraints
		const hasFixX = this.hasFixXConstraint(point.id, geometry)
		const hasFixY = this.hasFixYConstraint(point.id, geometry)
		const isFixed = hasFixX || hasFixY
		const isFullyFixed = hasFixX && hasFixY

		this.ctx.save()

		// Point circle
		this.ctx.beginPath()
		const radius = isFixed ? 5 : 4 // Fixed points are slightly larger
		this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI)

		if (isFixed) {
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
			this.ctx.strokeStyle = "#c44569"
			this.ctx.lineWidth = 2
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
				this.ctx.lineWidth = 2
				this.ctx.stroke()
			}
		}

		// Selection ring
		if (isSelected || isHovered) {
			this.ctx.beginPath()
			this.ctx.arc(point.x, point.y, radius + 2, 0, 2 * Math.PI)
			this.ctx.strokeStyle = isFixed
				? isSelected
					? "#c44569"
					: "#ff6b81"
				: isSelected
					? "#1971c2"
					: "#74c0fc"
			this.ctx.lineWidth = 2
			this.ctx.stroke()
		}

		this.ctx.restore()
	}

	private renderLines(geometry: Geometry, selection: SelectionState): void {
		geometry.lines.forEach((line) => {
			this.renderLine(line, geometry, selection)
		})
	}

	private renderLine(
		line: Line,
		geometry: Geometry,
		selection: SelectionState
	): void {
		const point1 = geometry.points.get(line.point1Id)
		const point2 = geometry.points.get(line.point2Id)

		if (!point1 || !point2) return

		const isSelected = selection.selectedIds.has(line.id)
		const isHovered = selection.hoveredId === line.id
		const hasLengthConstraint = geometry.constraints.has(
			`line-length-${line.id}`
		)

		this.ctx.save()

		if (hasLengthConstraint) {
			// Constrained lines use red color scheme (like fixed points)
			this.ctx.strokeStyle = isSelected
				? "#ff4757" // Bright red when selected
				: isHovered
					? "#ff6b81" // Light red when hovered
					: "#dc3545" // Red when constrained
		} else {
			// Normal lines use blue/gray color scheme
			this.ctx.strokeStyle = isSelected
				? "#4dabf7" // Blue when selected
				: isHovered
					? "#74c0fc" // Light blue when hovered
					: "#6c757d" // Gray default
		}
		this.ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1

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

	private renderCircles(geometry: Geometry, selection: SelectionState): void {
		geometry.circles.forEach((circle) => {
			this.renderCircle(circle, geometry, selection)
		})
	}

	private renderCircle(
		circle: Circle,
		geometry: Geometry,
		selection: SelectionState
	): void {
		const center = geometry.points.get(circle.centerId)
		if (!center) return

		const isSelected = selection.selectedIds.has(circle.id)
		const isHovered = selection.hoveredId === circle.id

		// Check if radius is fixed
		const hasFixRadius = Array.from(geometry.constraints.entries()).some(
			([, constraint]) =>
				constraint.type === "radius" && constraint.entityIds.includes(circle.id)
		)

		this.ctx.save()

		// Use red color for fixed radius circles, similar to fixed points
		if (hasFixRadius) {
			this.ctx.strokeStyle = isSelected ? "#dc3545" : "#c44569"
			this.ctx.lineWidth = isSelected ? 4 : 2
		} else {
			this.ctx.strokeStyle = isSelected
				? "#4dabf7"
				: isHovered
					? "#74c0fc"
					: "#6c757d"
			this.ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1
		}

		this.ctx.fillStyle = "transparent"

		const radius = getCircleRadius(circle, geometry)
		this.ctx.beginPath()
		this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
		this.ctx.stroke()

		this.ctx.restore()
	}

	private renderLabels(geometry: Geometry, selection: SelectionState): void {
		geometry.labels.forEach((label) => {
			if (label.visible) {
				this.renderLabel(label, geometry, selection)
			}
		})
	}

	private renderLabel(
		label: Label,
		geometry: Geometry,
		selection: SelectionState
	): void {
		const position = calculateLabelPosition(label, geometry)
		const text = calculateLabelText(label, geometry)
		
		if (!position || !text) return

		const isSelected = selection.selectedIds.has(label.id)
		const isHovered = selection.hoveredId === label.id

		this.ctx.save()

		// Render leader lines if label is moved far from entity
		this.renderLeaderLine(label, geometry, position, isSelected, isHovered)

		// Render dimension lines for distance labels
		if (label.type === "distance") {
			const [point1Id, point2Id] = label.entityIds
			const p1 = geometry.points.get(point1Id)
			const p2 = geometry.points.get(point2Id)
			if (p1 && p2) {
				this.renderDimensionLine(p1, p2, position, isSelected, isHovered)
			}
		}

		// Render angle arc for angle labels
		if (label.type === "angle") {
			const [point1Id, vertexId, point2Id] = label.entityIds
			const p1 = geometry.points.get(point1Id)
			const vertex = geometry.points.get(vertexId)
			const p2 = geometry.points.get(point2Id)
			if (p1 && vertex && p2) {
				this.renderAngleArc(p1, vertex, p2, isSelected, isHovered)
			}
		}

		// Render label text with background
		this.renderLabelText(text, position, isSelected, isHovered)

		this.ctx.restore()
	}

	private renderDimensionLine(
		p1: Point,
		p2: Point,
		labelPosition: { x: number; y: number },
		isSelected: boolean,
		isHovered: boolean
	): void {
		const { start, end, extensionLines } = calculateDimensionLineEndpoints(p1, p2, labelPosition)
		
		const color = isSelected ? "#4dabf7" : isHovered ? "#74c0fc" : "#666"
		const lineWidth = isSelected ? 2 : 1

		this.ctx.strokeStyle = color
		this.ctx.lineWidth = lineWidth

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
		this.renderDimensionArrows(start, end, color, lineWidth)
	}

	private renderDimensionArrows(
		start: { x: number; y: number },
		end: { x: number; y: number },
		color: string,
		lineWidth: number
	): void {
		const arrowSize = 5
		
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
		this.ctx.lineWidth = lineWidth

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
		isSelected: boolean,
		isHovered: boolean
	): void {
		const { centerX, centerY, radius, startAngle, endAngle } = calculateAngleArc(p1, vertex, p2)
		
		const color = isSelected ? "#4dabf7" : isHovered ? "#74c0fc" : "#666"
		const lineWidth = isSelected ? 2 : 1

		this.ctx.strokeStyle = color
		this.ctx.lineWidth = lineWidth
		this.ctx.fillStyle = "transparent"

		// Draw arc
		this.ctx.beginPath()
		this.ctx.arc(centerX, centerY, radius, startAngle, endAngle)
		this.ctx.stroke()
	}

	private renderLabelText(
		text: string,
		position: { x: number; y: number },
		isSelected: boolean,
		isHovered: boolean
	): void {
		// Calculate text dimensions for background
		this.ctx.font = "12px Arial"
		this.ctx.textAlign = "center"
		this.ctx.textBaseline = "middle"
		
		const textMetrics = this.ctx.measureText(text)
		const textWidth = textMetrics.width
		const textHeight = 16 // Approximate font height
		
		const padding = 4
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
		this.ctx.lineWidth = isSelected ? 2 : 1
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
		this.ctx.lineWidth = isSelected ? 2 : 1
		this.ctx.setLineDash([3, 3]) // Dashed line

		this.ctx.beginPath()
		this.ctx.moveTo(targetPoint.x, targetPoint.y)
		this.ctx.lineTo(labelPosition.x, labelPosition.y)
		this.ctx.stroke()
		
		// Draw arrowhead at the target end of the line
		this.drawArrowhead(targetPoint, labelPosition, isSelected, isHovered)
		
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
		isSelected: boolean,
		isHovered: boolean
	): void {
		const arrowLength = 8
		const arrowWidth = 4

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

	private renderGridLegend(viewport: Viewport): void {
		const currentGridSize = this.calculateOptimalGridSize(viewport)
		const currentPixelSpacing = currentGridSize * viewport.zoom

		this.ctx.save()
		// Reset transform to screen coordinates
		this.ctx.setTransform(1, 0, 0, 1, 0, 0)

		// Calculate legend dimensions based on line length
		const scaleLineLength = Math.min(currentPixelSpacing, 100) // Cap at 100px for very large grid
		const legendWidth = scaleLineLength + 80 // Extra space for text
		const legendHeight = 30
		const margin = 10
		const x = this.canvas.width - legendWidth - margin
		const y = this.canvas.height - legendHeight - margin

		this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
		this.ctx.fillRect(x, y, legendWidth, legendHeight)

		this.ctx.strokeStyle = "#ccc"
		this.ctx.lineWidth = 1
		this.ctx.strokeRect(x, y, legendWidth, legendHeight)

		// Draw grid scale indicator - line matches actual grid spacing
		const scaleLineY = y + legendHeight / 2
		const scaleStartX = x + 10
		const scaleEndX = scaleStartX + scaleLineLength

		this.ctx.strokeStyle = "#666"
		this.ctx.lineWidth = 2
		this.ctx.beginPath()
		this.ctx.moveTo(scaleStartX, scaleLineY)
		this.ctx.lineTo(scaleEndX, scaleLineY)

		// Add tick marks
		this.ctx.moveTo(scaleStartX, scaleLineY - 3)
		this.ctx.lineTo(scaleStartX, scaleLineY + 3)
		this.ctx.moveTo(scaleEndX, scaleLineY - 3)
		this.ctx.lineTo(scaleEndX, scaleLineY + 3)
		this.ctx.stroke()

		// Add label showing grid size
		this.ctx.fillStyle = "#333"
		this.ctx.font = "12px Arial"
		this.ctx.textAlign = "left"
		this.ctx.textBaseline = "middle"

		const unitsText = this.formatGridSize(currentGridSize)
		this.ctx.fillText(unitsText, scaleEndX + 8, scaleLineY)

		this.ctx.restore()
	}

	private formatGridSize(size: number): string {
		if (size >= 1000) {
			return size.toLocaleString('en-US')
		} else if (size >= 100) {
			return `${Math.round(size)}`
		} else if (size >= 10) {
			return `${size.toFixed(1)}`
		} else if (size >= 1) {
			return `${size.toFixed(1)}`
		} else if (size >= 0.1) {
			return `${size.toFixed(2)}`
		} else if (size >= 0.01) {
			return `${size.toFixed(3)}`
		} else {
			return `${size.toExponential(1)}`
		}
	}

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
}
