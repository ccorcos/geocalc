import { describe, test, expect } from 'vitest'
import { ViewportCalcs, type Viewport } from './types'

describe('ViewportCalcs', () => {
	// Helper function to create test viewport
	const createViewport = (
		scale: number = 100, 
		zoom: number = 1, 
		canvasWidth: number = 800, 
		canvasHeight: number = 600
	): Viewport => ({
		x: 0,
		y: 0,
		scale,
		zoom,
		canvasWidth,
		canvasHeight,
	})

	describe('worldWidth', () => {
		test('should follow the formula: scale / zoom * 1.2', () => {
			expect(ViewportCalcs.worldWidth(createViewport(100, 1))).toBeCloseTo(120, 3) // 100/1 * 1.2
			expect(ViewportCalcs.worldWidth(createViewport(100, 2))).toBeCloseTo(60, 3)  // 100/2 * 1.2  
			expect(ViewportCalcs.worldWidth(createViewport(100, 0.5))).toBeCloseTo(240, 3) // 100/0.5 * 1.2
			expect(ViewportCalcs.worldWidth(createViewport(10, 1))).toBeCloseTo(12, 3)   // 10/1 * 1.2
			expect(ViewportCalcs.worldWidth(createViewport(10, 10))).toBeCloseTo(1.2, 3) // 10/10 * 1.2
			expect(ViewportCalcs.worldWidth(createViewport(1000, 0.1))).toBeCloseTo(12000, 3) // 1000/0.1 * 1.2
		})
	})

	describe('worldHeight', () => {
		test('should maintain aspect ratio with worldWidth', () => {
			const viewport = createViewport(100, 1, 800, 600) // 4:3 aspect ratio
			const worldWidth = ViewportCalcs.worldWidth(viewport)
			const worldHeight = ViewportCalcs.worldHeight(viewport)
			
			expect(worldHeight / worldWidth).toBeCloseTo(600 / 800, 3) // Same aspect ratio
			expect(worldHeight).toBeCloseTo(90, 3) // 120 * (600/800)
		})

		test('should work with different aspect ratios', () => {
			const squareViewport = createViewport(100, 1, 400, 400)
			expect(ViewportCalcs.worldHeight(squareViewport)).toBeCloseTo(120, 3)

			const wideViewport = createViewport(100, 1, 1200, 400)  
			expect(ViewportCalcs.worldHeight(wideViewport)).toBeCloseTo(40, 3) // 120 * (400/1200)
		})
	})

	describe('pixelsPerUnit', () => {
		test('should be canvasWidth / worldWidth', () => {
			const viewport = createViewport(100, 1, 800, 600)
			const pixelsPerUnit = ViewportCalcs.pixelsPerUnit(viewport)
			
			expect(pixelsPerUnit).toBeCloseTo(800 / 120, 3) // 800 / (100/1 * 1.2)
		})

		test('should change with zoom level', () => {
			const baseViewport = createViewport(100, 1, 800)
			const zoomedViewport = createViewport(100, 2, 800)
			
			const basePPU = ViewportCalcs.pixelsPerUnit(baseViewport)
			const zoomedPPU = ViewportCalcs.pixelsPerUnit(zoomedViewport)
			
			expect(zoomedPPU).toBeCloseTo(basePPU * 2, 3) // Zoomed in = more pixels per unit
		})
	})

	describe('visibleBounds', () => {
		test('should center viewport at (x,y) with correct world dimensions', () => {
			const viewport = createViewport(100, 1, 800, 600)
			viewport.x = 50
			viewport.y = 25

			const bounds = ViewportCalcs.visibleBounds(viewport)

			expect(bounds.left).toBeCloseTo(-10, 3) // 50 - 60
			expect(bounds.right).toBeCloseTo(110, 3) // 50 + 60  
			expect(bounds.top).toBeCloseTo(-20, 3) // 25 - 45
			expect(bounds.bottom).toBeCloseTo(70, 3) // 25 + 45
		})
	})

	describe('gridSpacing', () => {
		test('should provide reasonable grid divisions based on viewport width', () => {
			// scale=100, zoom=1: viewport=120, target=10, grid=10
			expect(ViewportCalcs.gridSpacing(createViewport(100, 1))).toBe(10)
			
			// scale=100, zoom=10: viewport=12, target=1, grid=1  
			expect(ViewportCalcs.gridSpacing(createViewport(100, 10))).toBe(1)
			
			// scale=100, zoom=0.1: viewport=1200, target=100, grid=100
			expect(ViewportCalcs.gridSpacing(createViewport(100, 0.1))).toBe(100)
			
			// scale=10, zoom=1: viewport=12, target=1, grid=1  
			expect(ViewportCalcs.gridSpacing(createViewport(10, 1))).toBe(1)
			
			// scale=1000, zoom=1: viewport=1200, target=100, grid=100
			expect(ViewportCalcs.gridSpacing(createViewport(1000, 1))).toBe(100)
			
			// scale=1, zoom=1: viewport=1.2, target=0.1, grid=0.1
			expect(ViewportCalcs.gridSpacing(createViewport(1, 1))).toBeCloseTo(0.1, 3)
		})

		test('should handle edge cases gracefully', () => {
			// Very small scale: viewport=0.012, target=0.001, grid=0.001
			expect(ViewportCalcs.gridSpacing(createViewport(0.01, 1))).toBeCloseTo(0.001, 3)
			
			// Very large scale: viewport=12000, target=1000, grid=1000  
			expect(ViewportCalcs.gridSpacing(createViewport(10000, 1))).toBe(1000)
			
			// Fractional viewport sizes
			expect(ViewportCalcs.gridSpacing(createViewport(3, 1))).toBeCloseTo(0.1, 3) // viewport=3.6, target=0.3, grid=0.1
			expect(ViewportCalcs.gridSpacing(createViewport(30, 1))).toBe(1) // viewport=36, target=3, grid=1
		})
	})

	describe('featureScale', () => {
		test('should return zoom when zoom < 1 (zoomed out)', () => {
			expect(ViewportCalcs.featureScale(createViewport(100, 0.1))).toBeCloseTo(0.1, 3)
			expect(ViewportCalcs.featureScale(createViewport(100, 0.5))).toBeCloseTo(0.5, 3)
			expect(ViewportCalcs.featureScale(createViewport(100, 0.9))).toBeCloseTo(0.9, 3)
		})

		test('should return 1 when zoom >= 1 (zoomed in or normal)', () => {
			expect(ViewportCalcs.featureScale(createViewport(100, 1))).toBe(1)
			expect(ViewportCalcs.featureScale(createViewport(100, 2))).toBe(1)
			expect(ViewportCalcs.featureScale(createViewport(100, 10))).toBe(1)
		})

		test('should be independent of scale', () => {
			expect(ViewportCalcs.featureScale(createViewport(1, 0.5))).toBe(0.5)
			expect(ViewportCalcs.featureScale(createViewport(1000, 0.5))).toBe(0.5)
			expect(ViewportCalcs.featureScale(createViewport(1, 2))).toBe(1)
			expect(ViewportCalcs.featureScale(createViewport(1000, 2))).toBe(1)
		})
	})

	describe('integration tests - user scenarios', () => {
		test('architectural drawing workflow', () => {
			// User is designing a 100m x 75m building (scale=1000)
			const building = createViewport(1000, 1, 800, 600)
			
			// At zoom=1: should see ~1200 units (building + margins)
			expect(ViewportCalcs.worldWidth(building)).toBeCloseTo(1200, 3)
			expect(ViewportCalcs.gridSpacing(building)).toBe(100) // viewport=1200, target=100, grid=100
			
			// Zoom in 4x for room detail: should see ~300 units
			const roomDetail = createViewport(1000, 4, 800, 600)
			expect(ViewportCalcs.worldWidth(roomDetail)).toBeCloseTo(300, 3)
			expect(ViewportCalcs.gridSpacing(roomDetail)).toBe(10) // viewport=300, target=25, grid=10
		})

		test('PCB design workflow', () => {
			// User is designing a 10mm x 8mm board (scale=10) 
			const board = createViewport(10, 1, 800, 600)
			
			// At zoom=1: should see ~12 units (board + margins)
			expect(ViewportCalcs.worldWidth(board)).toBeCloseTo(12, 3)
			expect(ViewportCalcs.gridSpacing(board)).toBe(1) // viewport=12, target=1, grid=1
			
			// Zoom in 20x for trace routing: should see ~0.6 units
			const traces = createViewport(10, 20, 800, 600)
			expect(ViewportCalcs.worldWidth(traces)).toBeCloseTo(0.6, 3)
			expect(ViewportCalcs.gridSpacing(traces)).toBeCloseTo(0.1, 3) // viewport=0.6, target=0.05, grid=0.1
		})

		test('math visualization workflow', () => {
			// User is plotting a function from -50 to +50 (scale=100)
			const function_plot = createViewport(100, 1, 800, 600)
			
			// At zoom=1: should see ~120 units (function domain + margins)
			expect(ViewportCalcs.worldWidth(function_plot)).toBeCloseTo(120, 3)
			expect(ViewportCalcs.gridSpacing(function_plot)).toBe(10) // viewport=120, target=10, grid=10
			
			// Zoom in 10x for function detail: should see ~12 units  
			const detail = createViewport(100, 10, 800, 600)
			expect(ViewportCalcs.worldWidth(detail)).toBeCloseTo(12, 3)
			expect(ViewportCalcs.gridSpacing(detail)).toBe(1) // viewport=12, target=1, grid=1
		})

		test('feature scaling consistency across scales', () => {
			// At zoom=1, all scales should have featureScale=1
			expect(ViewportCalcs.featureScale(createViewport(1, 1))).toBe(1)
			expect(ViewportCalcs.featureScale(createViewport(100, 1))).toBe(1)
			expect(ViewportCalcs.featureScale(createViewport(10000, 1))).toBe(1)
			
			// At zoom=0.5, all scales should have featureScale=0.5
			expect(ViewportCalcs.featureScale(createViewport(1, 0.5))).toBe(0.5)
			expect(ViewportCalcs.featureScale(createViewport(100, 0.5))).toBe(0.5)
			expect(ViewportCalcs.featureScale(createViewport(10000, 0.5))).toBe(0.5)
		})
	})
})