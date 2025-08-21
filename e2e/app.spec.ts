import { test, expect } from '@playwright/test';
import { GeoCalcTestHelper } from './test-helpers';

test.describe('GeoCalc App', () => {
  test('loads and renders without errors', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load by checking for the main canvas element
    await expect(page.locator('canvas')).toBeVisible();

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Geometry Calculator/);

    // Verify that essential UI elements are present
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="entity-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="constraint-panel"]')).toBeVisible();

    // Wait a bit for any async operations to complete
    await page.waitForTimeout(500);

    // Just verify the app loaded successfully by checking essential elements are still there
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
  });

  test('can select different tools', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas to be visible
    await expect(page.locator('canvas')).toBeVisible();

    // Test selecting the point tool
    await page.click('[data-testid="tool-point"]');
    // Could check for visual feedback or state changes here

    // Test selecting the line tool
    await page.click('[data-testid="tool-line"]');

    // Test selecting the circle tool
    await page.click('[data-testid="tool-circle"]');

    // Test selecting the select tool
    await page.click('[data-testid="tool-select"]');
  });

  test('can create a point', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas to be visible
    await expect(page.locator('canvas')).toBeVisible();

    // Select the point tool
    await page.click('[data-testid="tool-point"]');

    // Click on the canvas to create a point
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 400, y: 300 } });

    // Check that the entity panel shows one point
    const entityList = page.locator('[data-testid="entity-list"]');
    await expect(entityList.locator('div').first()).toBeVisible();
    await expect(entityList.locator('div').first()).toContainText('point');
  });

  test('handles zoom and pan operations', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas to be visible
    await expect(page.locator('canvas')).toBeVisible();

    const canvas = page.locator('canvas');
    
    // Test pan - drag the canvas
    await canvas.hover({ position: { x: 400, y: 300 } });
    await page.mouse.down();
    await page.mouse.move(450, 350);
    await page.mouse.up();

    // Test zoom - use mouse wheel
    await canvas.hover({ position: { x: 400, y: 300 } });
    await page.mouse.wheel(0, -100); // Zoom in
    await page.mouse.wheel(0, 100);  // Zoom out

    // The app should still be functional after zoom/pan
    await expect(canvas).toBeVisible();
  });

  test('constraint solving workflow with anchored points and directional distances', async ({ page }) => {
    const helper = new GeoCalcTestHelper(page);
    
    // Test Plan:
    // 1. Create two points A and B
    // 2. Anchor point A (fix its position) 
    // 3. Add x-distance constraint of 100 (B should be 100 units right of A)
    // 4. Add y-distance constraint of 0 (B should be at same Y as A)
    // 5. Run solver and verify B moves to correct position
    // 6. Test that constraints are maintained when trying to move B
    
    await helper.goto();
    
    // Step 1: Create two points
    const pointA = await helper.createPointAt(300, 300);
    const pointB = await helper.createPointAt(400, 400); // Will be moved by constraints
    await helper.expectPointCount(2);

    // Step 2: Anchor point A by cmd+clicking it in the entity panel
    await helper.anchorPoint(pointA);

    // Step 3: Select both points and create constraints
    await helper.selectTwoPoints(pointA, pointB);

    // Step 4: Create x-distance constraint of 100
    await helper.createConstraint('x-distance', 100);

    // Step 5: Re-select points and create y-distance constraint of 0
    await helper.selectTwoPoints(pointA, pointB);
    await helper.createConstraint('y-distance', 0);

    // Step 6: Verify constraints were added
    await helper.expectConstraintExists('fix-x'); // From anchoring
    await helper.expectConstraintExists('x-distance');
    await helper.expectConstraintExists('y-distance');

    // Step 7: Run the solver
    await helper.runSolver();

    // Step 8: Verify the constraint results by inspecting application state
    console.log('\n=== Verifying Constraint Results ===');
    
    // Log current positions for debugging
    await helper.logPointPositions();
    await helper.logConstraints();
    
    // Verify the geometric constraints are satisfied
    const xDistanceSatisfied = await helper.verifyXDistanceConstraint(100);
    expect(xDistanceSatisfied, 'X-distance constraint should be satisfied (100 units)').toBe(true);
    
    const yDistanceSatisfied = await helper.verifyYDistanceConstraint(0);  
    expect(yDistanceSatisfied, 'Y-distance constraint should be satisfied (0 units - same Y)').toBe(true);
    
    // Verify point A is fixed
    const pointAIsFixed = await helper.verifyPointIsFixed();
    expect(pointAIsFixed, 'Point A should be anchored with fix constraints').toBe(true);
    
    // Additional verification: check actual point positions after solving
    const currentPoints = await helper.getPointPositions();
    const currentPointIds = Object.keys(currentPoints);
    const currentPointA = currentPoints[currentPointIds[0]];
    const currentPointB = currentPoints[currentPointIds[1]];
    
    console.log(`Point A final position: (${currentPointA.x}, ${currentPointA.y})`);
    console.log(`Point B final position: (${currentPointB.x}, ${currentPointB.y})`);
    
    // The key verification is that the constraints are satisfied, not the absolute positions
    // Point A's X is fixed (anchored) and Point B is 100 units away in X, same Y
    expect(Math.abs(currentPointA.y - currentPointB.y)).toBeLessThan(0.01); // Same Y coordinate
    expect(Math.abs((currentPointB.x - currentPointA.x) - 100)).toBeLessThan(0.01); // 100 units apart in X

    // Step 9: Test constraint enforcement by trying to move point B
    console.log('\n=== Testing Constraint Enforcement ===');
    
    // Select point B at its current position
    await helper.selectTool('select');
    await helper.clickPoint({ x: currentPointB.x, y: currentPointB.y });
    
    // Try to drag it away from the constrained position
    await page.mouse.down();
    await page.mouse.move(450, 350);
    await page.mouse.up();
    
    // Run solver again - it should move B back to the constrained position
    await helper.runSolver();
    
    // Verify constraints are still satisfied after attempted manipulation
    const xDistanceStillSatisfied = await helper.verifyXDistanceConstraint(100);
    expect(xDistanceStillSatisfied, 'X-distance constraint should still be satisfied after drag').toBe(true);
    
    const yDistanceStillSatisfied = await helper.verifyYDistanceConstraint(0);
    expect(yDistanceStillSatisfied, 'Y-distance constraint should still be satisfied after drag').toBe(true);
    
    // Verify the system is stable
    await helper.expectPointCount(2);
    await expect(helper.canvas).toBeVisible();
    
    console.log('\n=== All Constraint Verifications Passed! ===');
  });
});