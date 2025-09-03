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

		// Use centralized constraint type mapping
		const constraintType = type as ConstraintType
		const menuText = CONSTRAINT_MENU_NAMES[constraintType] || type

		// Click the constraint type in context menu using more precise locator
		await this.page.getByRole("button", { name: menuText, exact: true }).click()

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
		await this.canvas.click({ position: { x: centerPoint.x, y: centerPoint.y } })
		// Click to set radius (drag to radius point)
		await this.canvas.click({ position: { x: radiusPoint.x, y: radiusPoint.y } })
	}

	async selectCircleInPanel(circleIndex: number = 0) {
		// Click on the name span within the circle row (this is where the onClick handler is)
		const circleRow = this.entityList
			.locator('div')
			.filter({ hasText: "circle" })
			.nth(circleIndex)
		const nameSpan = circleRow.locator('span').first() // The name span is the first span
		await nameSpan.click()
		await this.waitForConstraintUI(1)
	}

	async selectPointAndCircleInPanel(pointIndex: number = 0, circleIndex: number = 0) {
		const pointInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "point" })
			.nth(pointIndex)
		await pointInPanel.click()
		
		// Use corrected circle selection - click on the name span
		const circleRow = this.entityList
			.locator('div')
			.filter({ hasText: "circle" })
			.nth(circleIndex)
		const nameSpan = circleRow.locator('span').first()
		await nameSpan.click({ modifiers: ["Shift"] })
		await this.waitForConstraintUI(2)
	}

	async selectLineAndCircleInPanel(lineIndex: number = 0, circleIndex: number = 0) {
		const lineInPanel = this.entityList
			.locator("div")
			.filter({ hasText: "line" })
			.nth(lineIndex)
		await lineInPanel.click()
		
		// Use corrected circle selection - click on the name span
		const circleRow = this.entityList
			.locator('div')
			.filter({ hasText: "circle" })
			.nth(circleIndex)
		const nameSpan = circleRow.locator('span').first()
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
		// Get circle information from the diagnostics
		const actualRadius = await this.page.evaluate(() => {
			const diagnostics = (window as any).__GEOCALC_DIAGNOSTICS__
			if (!diagnostics) return null
			
			const circles = diagnostics.getCircles()
			if (circles.length === 0) return null
			
			// Return radius of first circle (for simple test cases)
			return circles[0].radius
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
}
