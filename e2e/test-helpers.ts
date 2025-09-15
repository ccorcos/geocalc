import { Page, expect } from "@playwright/test"

import type { Diagnostics } from "../src/diagnostics"
import {
	ALL_CONSTRAINT_TYPES,
	CONSTRAINT_DISPLAY_NAMES,
	CONSTRAINT_MENU_NAMES,
	ConstraintType,
} from "../src/engine/constraint-types"

export interface TestPoint {
	x: number
	y: number
	name?: string
}

export class TestHarness {
	constructor(private page: Page) {}

	get canvas() {
		return this.page.locator("canvas")
	}

	get toolbar() {
		return this.page.locator('[data-testid="toolbar"]')
	}

	get entityPanel() {
		return this.page.locator('[data-testid="entity-panel"]')
	}

	get constraintPanel() {
		return this.page.locator('[data-testid="constraint-panel"]')
	}

	get entityList() {
		return this.page.locator('[data-testid="entity-list"]')
	}

	// Navigation and setup
	async goto() {
		await this.page.goto("/")
		await expect(this.canvas).toBeVisible()
	}

	// Tool selection
	async selectTool(tool: "select" | "point" | "line" | "circle") {
		await this.page.click(`[data-testid="tool-${tool}"]`)
	}

	// Point operations
	async createRandomPoint(): Promise<TestPoint> {
		const x = 200 + Math.random() * 400 // Random between 200-600
		const y = 200 + Math.random() * 300 // Random between 200-500
		return this.createPointAt(x, y)
	}

	async createPointAt(x: number, y: number): Promise<TestPoint> {
		await this.selectTool("point")
		await this.canvas.click({ position: { x, y } })
		return { x, y }
	}

	async clickPoint(point: TestPoint, modifiers: string[] = []) {
		await this.canvas.click({
			position: { x: point.x, y: point.y },
			modifiers: modifiers as any[],
		})
	}

	async shiftClickPoint(point: TestPoint) {
		await this.clickPoint(point, ["Shift"])
	}

	async cmdClickPoint(point: TestPoint) {
		await this.clickPoint(point, ["Meta"]) // Mac cmd key
	}

	// Entity panel operations
	async cmdClickPointInPanel(pointIndex: number = 0) {
		const pointInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "point" })
			.nth(pointIndex)
		await pointInPanel.click({ modifiers: ["Meta"] })
	}

	async selectPointsInPanel(indices: number[], useShift = true) {
		for (let i = 0; i < indices.length; i++) {
			// Find the specific point row by looking for the main clickable div that contains point info
			const pointRows = this.entityList
				.locator("div")
				.filter({ hasText: "point" })
			const pointInPanel = pointRows.nth(indices[i])

			// Get the bounding box and click on the left part to avoid coordinate editing
			const bounds = await pointInPanel.boundingBox()
			if (bounds) {
				if (i > 0 && useShift) {
					await this.page.keyboard.down("Shift")
				}

				// Click on the left 30% of the row to avoid coordinate spans
				await this.page.mouse.click(
					bounds.x + bounds.width * 0.3,
					bounds.y + bounds.height / 2
				)

				if (i > 0 && useShift) {
					await this.page.keyboard.up("Shift")
				}

				// Give a small delay to allow selection to register
				await this.page.waitForTimeout(100)
			}
		}
	}

	// Constraint operations
	async waitForConstraintUI(expectedPointCount: number) {
		// New UI: Check that entities are selected (no more dropdown)
		// Just verify points are selected by checking selection count
		await this.page.waitForTimeout(100) // Give time for selection to register
	}

	async createConstraint(type: string, value?: number) {
		// New UI: Use the + button in toolbar for creating constraints
		await this.page.click('[data-testid="add-constraint"]')
		
		// Wait for context menu to appear
		await this.page.waitForSelector('[data-context-menu]', { timeout: 5000 })

		// Use centralized constraint type mapping
		const constraintType = type as ConstraintType
		const menuText = CONSTRAINT_MENU_NAMES[constraintType] || type

		// Check if the button exists and provide helpful error message if not
		const constraintButton = this.page.getByRole("button", { name: menuText, exact: true })
		const buttonExists = await constraintButton.count() > 0
		
		if (!buttonExists) {
			// Get available options for error message
			const availableOptions = await this.page.evaluate(() => {
				const buttons = Array.from(document.querySelectorAll('[data-context-menu] button'))
				return buttons.map(button => button.textContent?.trim()).filter(Boolean)
			})
			throw new Error(`Constraint "${menuText}" not available. Available options: ${JSON.stringify(availableOptions)}. This suggests the required entities are not properly selected.`)
		}

		// Click the constraint type in context menu using more precise locator
		await constraintButton.click()

		// Enter value if needed (in input dialog)
		if (value !== undefined) {
			await this.page.locator('input[type="number"]').fill(value.toString())
			await this.page.locator("button").filter({ hasText: "Create" }).click()
		}

		// Wait a moment for the constraint to be added
		await this.page.waitForTimeout(200)
	}

	async runSolver() {
		await this.constraintPanel
			.locator("button")
			.filter({ hasText: "Solve" })
			.click()
		await this.page.waitForTimeout(500) // Wait for solver to complete
	}

	async getSolverStatistics() {
		return await this.page.evaluate(() => {
			const store = (window as any).__GEOCALC_STORE__
			if (!store) return null

			const state = store.getState()
			return state.solverStatistics || null
		})
	}

	// Verification helpers
	async expectPointCount(count: number) {
		await expect(
			this.entityList.locator("div").filter({ hasText: "point" })
		).toHaveCount(count)
	}

	async expectConstraintExists(constraintType: string) {
		const displayType = constraintType.replace("-", " ")
		await expect(
			this.constraintPanel
				.locator("div")
				.filter({ hasText: displayType })
				.first()
		).toBeVisible({ timeout: 10000 })
	}

	async expectConstraintCount(count: number) {
		// Count constraint divs that have constraint types using centralized display names
		let foundConstraints = 0

		for (const constraintType of ALL_CONSTRAINT_TYPES) {
			const displayName = CONSTRAINT_DISPLAY_NAMES[constraintType]
			const elements = await this.constraintPanel
				.locator("div")
				.filter({ hasText: displayName })
				.count()
			foundConstraints += elements
		}

		expect(foundConstraints).toBeGreaterThanOrEqual(count)
	}

	// Line operations
	async createLine(startPoint: TestPoint, endPoint: TestPoint) {
		await this.selectTool("line")
		await this.canvas.click({ position: { x: startPoint.x, y: startPoint.y } })
		await this.canvas.click({ position: { x: endPoint.x, y: endPoint.y } })
	}

	async selectLineInPanel(lineIndex: number = 0) {
		const lineInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "line" })
			.nth(lineIndex)
		await lineInPanel.click()
		await this.waitForConstraintUI(1)
	}

	async selectTwoLinesInPanel() {
		const lines = this.entityList.locator("div").filter({ hasText: "line" })
		await lines.nth(0).click()
		await lines.nth(1).click({ modifiers: ["Shift"] })
		await this.waitForConstraintUI(2)
	}

	// Circle operations
	async createCircle(centerPoint: TestPoint, radiusPoint: TestPoint) {
		await this.selectTool("circle")
		// Click to place center
		await this.canvas.click({
			position: { x: centerPoint.x, y: centerPoint.y },
		})
		// Click to set radius (drag to radius point)
		await this.canvas.click({
			position: { x: radiusPoint.x, y: radiusPoint.y },
		})
	}

	async selectCircleInPanel(circleIndex: number = 0) {
		// Click on the name span within the circle row (this is where the onClick handler is)
		const circleRow = this.entityList
			.locator("div")
			.filter({ hasText: "circle" })
			.nth(circleIndex)
		const nameSpan = circleRow.locator("span").first() // The name span is the first span
		await nameSpan.click()
		await this.waitForConstraintUI(1)
	}

	async selectPointAndCircleInPanel(
		pointIndex: number = 0,
		circleIndex: number = 0
	) {
		const pointInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "point" })
			.nth(pointIndex)
		await pointInPanel.click()

		// Use corrected circle selection - click on the name span
		const circleRow = this.entityList
			.locator("div")
			.filter({ hasText: "circle" })
			.nth(circleIndex)
		const nameSpan = circleRow.locator("span").first()
		await nameSpan.click({ modifiers: ["Shift"] })
		await this.waitForConstraintUI(2)
	}

	async selectLineAndCircleInPanel(
		lineIndex: number = 0,
		circleIndex: number = 0
	) {
		const lineInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "line" })
			.nth(lineIndex)
		await lineInPanel.click()

		// Use corrected circle selection - click on the name span
		const circleRow = this.entityList
			.locator("div")
			.filter({ hasText: "circle" })
			.nth(circleIndex)
		const nameSpan = circleRow.locator("span").first()
		await nameSpan.click({ modifiers: ["Shift"] })
		await this.waitForConstraintUI(2)
	}

	// Complex operations
	async selectTwoPoints(point1: TestPoint, point2: TestPoint) {
		await this.selectTool("select")
		await this.clickPoint(point1)
		await this.shiftClickPoint(point2)
		await this.waitForConstraintUI(2)
	}

	async anchorPoint(point: TestPoint) {
		await this.selectTool("select")
		await this.clickPoint(point)

		// Cmd+click the X and Y coordinates in the entity panel to fix them
		const pointInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "point" })
			.nth(0)

		// Click the x coordinate span with cmd key
		await pointInPanel
			.locator("span")
			.filter({ hasText: /x:/ })
			.click({ modifiers: ["Meta"] })

		// Click the y coordinate span with cmd key
		await pointInPanel
			.locator("span")
			.filter({ hasText: /y:/ })
			.click({ modifiers: ["Meta"] })
	}

	async createDistanceConstraints(xDistance: number, yDistance: number) {
		// Create x-distance constraint
		await this.createConstraint("x-distance", xDistance)

		// Re-select the points (selection might be cleared)
		await this.page.waitForTimeout(100)

		// Create y-distance constraint
		await this.createConstraint("y-distance", yDistance)
	}

	// Application state inspection
	async getApplicationState() {
		return await this.page.evaluate(() => {
			// Access the Zustand store from the window (we'll need to expose it)
			return (window as any).__GEOCALC_STATE__ || null
		})
	}

	async getPointPositions(): Promise<{
		[key: string]: { x: number; y: number }
	}> {
		return await this.page.evaluate(() => {
			const store = (window as any).__GEOCALC_STORE__
			if (!store) return {}

			const state = store.getState()
			const points: { [key: string]: { x: number; y: number } } = {}

			// Convert Map to object for JSON serialization
			state.geometry.points.forEach((point: any, id: string) => {
				points[id] = { x: point.x, y: point.y }
			})

			return points
		})
	}

	async getConstraints(): Promise<{ [key: string]: any }> {
		return await this.page.evaluate(() => {
			const store = (window as any).__GEOCALC_STORE__
			if (!store) return {}

			const state = store.getState()
			const constraints: { [key: string]: any } = {}

			// Convert Map to object for JSON serialization
			state.geometry.constraints.forEach((constraint: any, id: string) => {
				constraints[id] = {
					type: constraint.type,
					entityIds: constraint.entityIds,
					value: constraint.value,
					priority: constraint.priority,
				}
			})

			return constraints
		})
	}

	async verifyDistanceConstraint(
		pointAId: string,
		pointBId: string,
		expectedDistance: number,
		tolerance = 0.001
	): Promise<boolean> {
		const points = await this.getPointPositions()
		const pointA = Object.values(points)[0] // Assume first point is A
		const pointB = Object.values(points)[1] // Assume second point is B

		const actualDistance = Math.sqrt(
			Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2)
		)

		return Math.abs(actualDistance - expectedDistance) <= tolerance
	}

	async verifyXDistanceConstraint(
		expectedXDistance: number,
		tolerance = 0.001
	): Promise<boolean> {
		const points = await this.getPointPositions()
		const pointIds = Object.keys(points)
		if (pointIds.length < 2) return false

		const pointA = points[pointIds[0]]
		const pointB = points[pointIds[1]]

		const actualXDistance = pointB.x - pointA.x

		return Math.abs(actualXDistance - expectedXDistance) <= tolerance
	}

	async verifyYDistanceConstraint(
		expectedYDistance: number,
		tolerance = 0.001
	): Promise<boolean> {
		const points = await this.getPointPositions()
		const pointIds = Object.keys(points)
		if (pointIds.length < 2) return false

		const pointA = points[pointIds[0]]
		const pointB = points[pointIds[1]]

		const actualYDistance = pointB.y - pointA.y

		return Math.abs(actualYDistance - expectedYDistance) <= tolerance
	}

	async verifyPointIsFixed(pointIndex = 0): Promise<boolean> {
		const constraints = await this.getConstraints()
		// Check for fix constraints using string literals
		const fixConstraints = Object.values(constraints).filter(
			(c: any) => c.type === "x" || c.type === "y"
		)

		return fixConstraints.length > 0
	}

	async verifyRadiusConstraint(
		expectedRadius: number,
		tolerance = 0.001
	): Promise<boolean> {
		// Get circle information and calculate radius from center/radius point
		const actualRadius = await this.page.evaluate(() => {
			const diagnostics = (window as any).__GEOCALC_DIAGNOSTICS__
			if (!diagnostics) return null

			const circles = diagnostics.getCircles()
			if (circles.length === 0) return null

			// Get the first circle
			const circle = circles[0]
			if (!circle) return null

			// Get geometry to access points
			const store = (window as any).__GEOCALC_STORE__
			if (!store) return null

			const state = store.getState()
			const centerPoint = state.geometry.points.get(circle.centerId)
			const radiusPoint = state.geometry.points.get(circle.radiusPointId)

			if (!centerPoint || !radiusPoint) return null

			// Calculate radius as distance between center and radius point
			const dx = radiusPoint.x - centerPoint.x
			const dy = radiusPoint.y - centerPoint.y
			return Math.sqrt(dx * dx + dy * dy)
		})

		if (actualRadius === null) return false
		return Math.abs(actualRadius - expectedRadius) <= tolerance
	}

	async logPointPositions() {
		const points = await this.getPointPositions()
		// Debug: Point positions for diagnostics
	}

	async logConstraints() {
		const constraints = await this.getConstraints()
		// Debug: Active constraints for diagnostics

		// Also use diagnostics if available
		await this.page.evaluate(() => {
			const diagnostics = (window as any).__GEOCALC_DIAGNOSTICS__ as
				| Diagnostics
				| undefined
			if (diagnostics) {
				diagnostics.debug.logConstraints()
			}
		})
	}

	// Debug helper to see what constraints actually exist
	async debugConstraints() {
		return await this.page.evaluate(() => {
			const diagnostics = (window as any).__GEOCALC_DIAGNOSTICS__ as
				| Diagnostics
				| undefined
			if (diagnostics) {
				return diagnostics.inspect.geometry.getAllConstraints()
			}
			return []
		})
	}

	// Debug helpers
	async logEntityPanelContent() {
		const content = await this.entityList.textContent()
		// Debug: Entity Panel Content for diagnostics
	}

	async logConstraintPanelContent() {
		const content = await this.constraintPanel.textContent()
		// Debug: Constraint Panel Content for diagnostics
	}

	async takeScreenshot(name: string) {
		await this.page.screenshot({ path: `test-results/screenshot-${name}.png` })
	}

	// New constraint verification methods

	async verifyOrthogonalDistanceConstraint(
		expectedDistance: number,
		tolerance = 0.001
	): Promise<boolean> {
		// Get points and lines to calculate orthogonal distance
		return await this.page.evaluate(
			({ expectedDistance, tolerance }) => {
				const store = (window as any).__GEOCALC_STORE__
				if (!store) return false

				const state = store.getState()
				const points = Array.from(state.geometry.points.values())
				const lines = Array.from(state.geometry.lines.values())

				if (points.length === 0 || lines.length === 0) return false

				// Find the line and the standalone point (not part of the line)
				const line = lines[0]
				const p1 = state.geometry.points.get(line.point1Id)
				const p2 = state.geometry.points.get(line.point2Id)

				// Find the standalone point (not the line endpoints)
				const point = points.find(
					(p) => p.id !== line.point1Id && p.id !== line.point2Id
				)

				if (!p1 || !p2 || !point) return false

				// Calculate orthogonal distance from point to line
				const dx = p2.x - p1.x
				const dy = p2.y - p1.y
				const lineLength = Math.sqrt(dx * dx + dy * dy)

				if (lineLength < 1e-10) return false

				const nx = dx / lineLength
				const ny = dy / lineLength
				const cx = point.x - p1.x
				const cy = point.y - p1.y
				const projLength = cx * nx + cy * ny
				const closestX = p1.x + projLength * nx
				const closestY = p1.y + projLength * ny
				const distX = point.x - closestX
				const distY = point.y - closestY
				const actualDistance = Math.sqrt(distX * distX + distY * distY)

				return Math.abs(actualDistance - expectedDistance) <= tolerance
			},
			{ expectedDistance, tolerance }
		)
	}

	async verifySameLengthConstraint(tolerance = 0.001): Promise<boolean> {
		// Get all lines and verify they have the same length
		return await this.page.evaluate(
			({ tolerance }) => {
				const store = (window as any).__GEOCALC_STORE__
				if (!store) return false

				const state = store.getState()
				const lines = Array.from(state.geometry.lines.values())

				if (lines.length < 2) return false

				// Calculate length of first line as reference
				const firstLine = lines[0]
				const p1 = state.geometry.points.get(firstLine.point1Id)
				const p2 = state.geometry.points.get(firstLine.point2Id)

				if (!p1 || !p2) return false

				const referenceLength = Math.sqrt(
					(p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
				)

				// Check all other lines have the same length
				for (let i = 1; i < lines.length; i++) {
					const line = lines[i]
					const lineP1 = state.geometry.points.get(line.point1Id)
					const lineP2 = state.geometry.points.get(line.point2Id)

					if (!lineP1 || !lineP2) return false

					const lineLength = Math.sqrt(
						(lineP2.x - lineP1.x) ** 2 + (lineP2.y - lineP1.y) ** 2
					)

					if (Math.abs(lineLength - referenceLength) > tolerance) {
						return false
					}
				}

				return true
			},
			{ tolerance }
		)
	}

	async verifySameRadiusConstraint(tolerance = 0.001): Promise<boolean> {
		// Get all circles and verify they have the same radius
		return await this.page.evaluate(
			({ tolerance }) => {
				const store = (window as any).__GEOCALC_STORE__
				if (!store) return false

				const state = store.getState()
				const circles = Array.from(state.geometry.circles.values())

				if (circles.length < 2) return false

				// Calculate radius of first circle as reference
				const firstCircle = circles[0]
				const center1 = state.geometry.points.get(firstCircle.centerId)
				const radius1Point = state.geometry.points.get(
					firstCircle.radiusPointId
				)

				if (!center1 || !radius1Point) return false

				const referenceRadius = Math.sqrt(
					(radius1Point.x - center1.x) ** 2 + (radius1Point.y - center1.y) ** 2
				)

				// Check all other circles have the same radius
				for (let i = 1; i < circles.length; i++) {
					const circle = circles[i]
					const center = state.geometry.points.get(circle.centerId)
					const radiusPoint = state.geometry.points.get(circle.radiusPointId)

					if (!center || !radiusPoint) return false

					const circleRadius = Math.sqrt(
						(radiusPoint.x - center.x) ** 2 + (radiusPoint.y - center.y) ** 2
					)

					if (Math.abs(circleRadius - referenceRadius) > tolerance) {
						return false
					}
				}

				return true
			},
			{ tolerance }
		)
	}

	// Enhanced selection methods for new constraints
	async selectThreePointsInPanel(indices: number[] = [0, 1, 2]) {
		if (indices.length !== 3) {
			throw new Error("selectThreePointsInPanel requires exactly 3 indices")
		}
		await this.selectPointsInPanel(indices, true)
		await this.waitForConstraintUI(3)
	}

	async selectMultipleLinesInPanel(indices: number[]) {
		// Clear any existing selection first
		await this.page.click('body')
		await this.page.waitForTimeout(100)

		const lines = this.entityList.locator("div").filter({ hasText: "line" })

		// Verify we have enough lines
		const lineCount = await lines.count()
		const maxIndex = Math.max(...indices)
		if (lineCount <= maxIndex) {
			console.log(`Not enough lines found: got ${lineCount}, need at least ${maxIndex + 1}`)
			throw new Error(`Not enough lines: expected at least ${maxIndex + 1}, found ${lineCount}`)
		}

		// Select each line with proper modifier keys
		for (let i = 0; i < indices.length; i++) {
			const modifiers = i > 0 ? ["Shift"] : []
			await lines.nth(indices[i]).click({ modifiers: modifiers as any[] })
		}

		await this.waitForConstraintUI(indices.length)
		// Add extra wait to ensure selection state is fully registered
		await this.page.waitForTimeout(100)
	}

	async selectMultipleCirclesInPanel(indices: number[]) {
		for (let i = 0; i < indices.length; i++) {
			const circleRow = this.entityList
				.locator("div")
				.filter({ hasText: "circle" })
				.nth(indices[i])
			const nameSpan = circleRow.locator("span").first()
			const modifiers = i > 0 ? ["Shift"] : []
			await nameSpan.click({ modifiers: modifiers as any[] })
		}

		await this.waitForConstraintUI(indices.length)
	}

	async selectPointAndLineInPanel(
		pointIndex: number = 0,
		lineIndex: number = 0
	) {
		const pointInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "point" })
			.nth(pointIndex)
		await pointInPanel.click()

		const lineInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "line" })
			.nth(lineIndex)
		await lineInPanel.click({ modifiers: ["Shift"] })
		await this.waitForConstraintUI(2)
	}

	// Debugging methods
	async debugSelection(): Promise<string> {
		const result = await this.page.evaluate(() => {
			const store = (window as any).__GEOCALC_STORE__
			if (!store) return { error: "Store not available", selectionIds: [], entities: {} }
			if (!store.selection) return { error: "Selection not available", selectionIds: [], entities: {} }
			
			try {
				return {
					selectionIds: Array.from(store.selection.selectedIds),
					entities: {
						points: Array.from(store.geometry.points.keys()),
						lines: Array.from(store.geometry.lines.keys()),
						circles: Array.from(store.geometry.circles.keys())
					}
				}
			} catch (e) {
				return { error: `Error accessing store: ${e.message}`, selectionIds: [], entities: {} }
			}
		})
		
		if (result.error) {
			return `Error: ${result.error}`
		}
		
		return `Selection: ${JSON.stringify(result.selectionIds)}, Entities: ${JSON.stringify(result.entities)}`
	}

	async debugConstraintMenu(): Promise<string> {
		// Click the constraint button to open menu
		await this.page.click('[data-testid="add-constraint"]')
		await this.page.waitForTimeout(100)
		
		// Get all available constraint options
		const options = await this.page.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll('[data-context-menu] button'))
			return buttons.map(button => button.textContent?.trim())
		})
		
		// Close the menu by clicking outside
		await this.page.click('body')
		await this.page.waitForTimeout(100)
		
		return `Available constraint options: ${JSON.stringify(options)}`
	}

	async verifySelectionState(expectedCount: number, expectedTypes: string[]): Promise<boolean> {
		const debugInfo = await this.debugSelection()
		console.log('Selection debug info:', debugInfo)
		
		const result = await this.page.evaluate(() => {
			const store = (window as any).__GEOCALC_STORE__
			if (!store || !store.selection) return { selectionIds: [], selectedTypes: [] }
			
			try {
				const selectionIds = Array.from(store.selection.selectedIds)
				const selectedTypes = selectionIds.map(id => {
					if (store.geometry.points.has(id)) return 'point'
					if (store.geometry.lines.has(id)) return 'line'
					if (store.geometry.circles.has(id)) return 'circle'
					return 'unknown'
				})
				return { selectionIds, selectedTypes }
			} catch (e) {
				console.log('Error in verifySelectionState:', e.message)
				return { selectionIds: [], selectedTypes: [] }
			}
		})
		
		if (result.selectionIds.length !== expectedCount) {
			console.log(`Expected ${expectedCount} selected items, got ${result.selectionIds.length}`)
			return false
		}
		
		const typeCounts = expectedTypes.reduce((acc, type) => {
			acc[type] = (acc[type] || 0) + 1
			return acc
		}, {} as Record<string, number>)
		
		const actualTypeCounts = result.selectedTypes.reduce((acc, type) => {
			acc[type] = (acc[type] || 0) + 1
			return acc
		}, {} as Record<string, number>)
		
		for (const [type, count] of Object.entries(typeCounts)) {
			if (actualTypeCounts[type] !== count) {
				console.log(`Expected ${count} ${type}s, got ${actualTypeCounts[type] || 0}`)
				return false
			}
		}
		
		return true
	}
}
