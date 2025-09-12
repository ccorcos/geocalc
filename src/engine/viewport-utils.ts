import type { Geometry, Viewport, Label } from "./types"
import { getCircleRadius } from "./geometry"
import { calculateLabelPosition, calculateLabelText } from "./label-positioning"

export interface DrawingBounds {
	minX: number
	maxX: number
	minY: number
	maxY: number
	width: number
	height: number
	center: { x: number; y: number }
}

/**
 * Calculate approximate text bounds for a label
 * This provides an estimate without requiring a canvas context
 */
const calculateLabelBounds = (label: Label, geometry: Geometry): { minX: number; maxX: number; minY: number; maxY: number } | null => {
	const position = calculateLabelPosition(label, geometry)
	const text = calculateLabelText(label, geometry)
	
	if (!position || !text) return null
	
	// Estimate text dimensions based on character count and font size
	// This is an approximation - actual rendering would be more accurate
	const avgCharWidth = 8 // Average character width in pixels for 12px Arial font
	const lineHeight = 16 // Line height in pixels for 12px font
	const padding = 8 // Padding around text in label background
	
	const textWidth = text.length * avgCharWidth + padding * 2
	const textHeight = lineHeight + padding * 2
	
	return {
		minX: position.x - textWidth / 2,
		maxX: position.x + textWidth / 2,
		minY: position.y - textHeight / 2,
		maxY: position.y + textHeight / 2
	}
}

export const calculateDrawingBounds = (geometry: Geometry): DrawingBounds | null => {
	let minX = Infinity
	let maxX = -Infinity
	let minY = Infinity
	let maxY = -Infinity
	let hasElements = false

	// Check all points
	for (const point of geometry.points.values()) {
		minX = Math.min(minX, point.x)
		maxX = Math.max(maxX, point.x)
		minY = Math.min(minY, point.y)
		maxY = Math.max(maxY, point.y)
		hasElements = true
	}

	// Check circle extents (center + radius in all directions)
	for (const circle of geometry.circles.values()) {
		const center = geometry.points.get(circle.centerId)
		if (center) {
			const radius = getCircleRadius(circle, geometry)
			minX = Math.min(minX, center.x - radius)
			maxX = Math.max(maxX, center.x + radius)
			minY = Math.min(minY, center.y - radius)
			maxY = Math.max(maxY, center.y + radius)
			hasElements = true
		}
	}

	// Check visible label bounds
	for (const label of geometry.labels.values()) {
		const bounds = calculateLabelBounds(label, geometry)
		if (bounds) {
			minX = Math.min(minX, bounds.minX)
			maxX = Math.max(maxX, bounds.maxX)
			minY = Math.min(minY, bounds.minY)
			maxY = Math.max(maxY, bounds.maxY)
			hasElements = true
		}
	}

	if (!hasElements) {
		return null
	}

	// Handle edge case where all elements are at the same point
	if (minX === maxX) {
		minX -= 1
		maxX += 1
	}
	if (minY === maxY) {
		minY -= 1
		maxY += 1
	}

	const width = maxX - minX
	const height = maxY - minY

	return {
		minX,
		maxX,
		minY,
		maxY,
		width,
		height,
		center: {
			x: (minX + maxX) / 2,
			y: (minY + maxY) / 2
		}
	}
}

export const fitToDrawing = (geometry: Geometry, viewport: Viewport): Viewport => {
	const bounds = calculateDrawingBounds(geometry)
	
	if (!bounds) {
		// Empty drawing - return to origin with default zoom
		return {
			...viewport,
			x: 0,
			y: 0,
			zoom: 1
		}
	}

	// Add 10% padding around drawing
	const padding = 0.1
	const targetZoomX = (viewport.width * (1 - padding)) / bounds.width
	const targetZoomY = (viewport.height * (1 - padding)) / bounds.height
	const targetZoom = Math.min(targetZoomX, targetZoomY)

	// Clamp zoom to reasonable limits
	const clampedZoom = Math.max(0.1, Math.min(100, targetZoom))

	return {
		...viewport,
		x: bounds.center.x,
		y: bounds.center.y,
		zoom: clampedZoom
	}
}

export const detectOptimalDisplayScale = (geometry: Geometry): number => {
	const bounds = calculateDrawingBounds(geometry)
	
	if (!bounds) {
		return 100 // Default scale for empty drawings (matches grid baseline)
	}

	const typicalSize = Math.sqrt(bounds.width * bounds.height)
	
	// Heuristic: display scale should make line widths comfortable to work with
	// Baseline is 100 (matching initial grid scale)
	if (typicalSize < 1) return 1000    // Micro drawings (0.01 units) -> 1000 scale
	if (typicalSize < 10) return 100    // Normal drawings (1-10 units) -> 100 scale  
	if (typicalSize < 1000) return 10   // Large drawings (100-1000 units) -> 10 scale
	return 1                            // Massive drawings (10k+ units) -> 1 scale
}

export const centerViewport = (geometry: Geometry, viewport: Viewport): Viewport => {
	const bounds = calculateDrawingBounds(geometry)
	
	if (!bounds) {
		// Empty drawing - center on origin
		return {
			...viewport,
			x: 0,
			y: 0
		}
	}

	return {
		...viewport,
		x: bounds.center.x,
		y: bounds.center.y
	}
}

export const resetViewport = (geometry: Geometry, viewport: Viewport): Viewport => {
	const bounds = calculateDrawingBounds(geometry)
	
	if (!bounds) {
		// Empty drawing - return to default state
		return {
			...viewport,
			x: 0,
			y: 0,
			zoom: 1,
			displayScale: 100
		}
	}

	return {
		...viewport,
		x: bounds.center.x,
		y: bounds.center.y,
		zoom: 1,
		displayScale: detectOptimalDisplayScale(geometry)
	}
}