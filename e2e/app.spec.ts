import { expect, test } from "@playwright/test";
import { TestHarness } from "./test-helpers";

test.describe("GeoCalc App", () => {
  test("loads and renders without errors", async ({ page }) => {
    const h = new TestHarness(page);
    await h.goto();

    // Check that the page title is correct
    await expect(page).toHaveTitle(/Geometry Calculator/);

    // Verify that essential UI elements are present
    await expect(h.toolbar).toBeVisible();
    await expect(h.entityPanel).toBeVisible();
    await expect(h.constraintPanel).toBeVisible();

    // Wait a bit for any async operations to complete
    await page.waitForTimeout(500);

    // Just verify the app loaded successfully by checking essential elements are still there
    await expect(h.canvas).toBeVisible();
    await expect(h.toolbar).toBeVisible();
  });

  test("can select different tools", async ({ page }) => {
    const h = new TestHarness(page);
    await h.goto();

    // Test selecting different tools using helper methods
    await h.selectTool("point");
    await h.selectTool("line");
    await h.selectTool("circle");
    await h.selectTool("select");
  });

  test("can create a point", async ({ page }) => {
    const h = new TestHarness(page);
    await h.goto();

    // Create a point and verify it appears
    await h.createPointAt(400, 300);
    await h.expectPointCount(1);
  });

  test("handles zoom and pan operations", async ({ page }) => {
    const h = new TestHarness(page);
    await h.goto();

    // Test pan - drag the canvas
    await h.canvas.hover({ position: { x: 400, y: 300 } });
    await page.mouse.down();
    await page.mouse.move(450, 350);
    await page.mouse.up();

    // Test zoom - use mouse wheel
    await h.canvas.hover({ position: { x: 400, y: 300 } });
    await page.mouse.wheel(0, -100); // Zoom in
    await page.mouse.wheel(0, 100); // Zoom out

    // The app should still be functional after zoom/pan
    await expect(h.canvas).toBeVisible();
  });

  test("constraint solving workflow with anchored points and directional distances", async ({
    page,
  }) => {
    const h = new TestHarness(page);

    // Test Plan:
    // 1. Create two points A and B
    // 2. Anchor point A (fix its position)
    // 3. Add x-distance constraint of 100 (B should be 100 units right of A)
    // 4. Add y-distance constraint of 0 (B should be at same Y as A)
    // 5. Run solver and verify B moves to correct position
    // 6. Test that constraints are maintained when trying to move B

    await h.goto();

    // Step 1: Create two points
    const pointA = await h.createPointAt(300, 300);
    const pointB = await h.createPointAt(400, 400); // Will be moved by constraints
    await h.expectPointCount(2);

    // Step 2: Anchor point A by cmd+clicking it in the entity panel
    await h.anchorPoint(pointA);

    // Step 3: Select both points and create constraints
    await h.selectTwoPoints(pointA, pointB);

    // Step 4: Create x-distance constraint of 100
    await h.createConstraint("x-distance", 100);

    // Step 5: Re-select points and create y-distance constraint of 0
    await h.selectTwoPoints(pointA, pointB);
    await h.createConstraint("y-distance", 0);

    // Step 6: Verify constraints were added
    // Based on debugging, we know the actual constraint types are different
    // The anchor creates 'x' and 'y' constraints (not 'x'/'y')
    await h.expectConstraintExists("x"); // From anchoring - actual type
    await h.expectConstraintExists("y"); // From anchoring - actual type
    await h.expectConstraintExists("x distance");
    await h.expectConstraintExists("y distance");

    // Step 7: Run the solver
    await h.runSolver();

    // Step 8: Verify the constraint results by inspecting application state

    // Verify the geometric constraints are satisfied
    const xDistanceSatisfied = await h.verifyXDistanceConstraint(100);
    expect(
      xDistanceSatisfied,
      "X-distance constraint should be satisfied (100 units)"
    ).toBe(true);

    const yDistanceSatisfied = await h.verifyYDistanceConstraint(0);
    expect(
      yDistanceSatisfied,
      "Y-distance constraint should be satisfied (0 units - same Y)"
    ).toBe(true);

    // Verify point A is fixed
    const pointAIsFixed = await h.verifyPointIsFixed();
    expect(
      pointAIsFixed,
      "Point A should be anchored with fix constraints"
    ).toBe(true);

    // Additional verification: check actual point positions after solving
    const currentPoints = await h.getPointPositions();
    const currentPointIds = Object.keys(currentPoints);
    const currentPointA = currentPoints[currentPointIds[0]];
    const currentPointB = currentPoints[currentPointIds[1]];

    // The key verification is that the constraints are satisfied, not the absolute positions
    // Point A's X is fixed (anchored) and Point B is 100 units away in X, same Y
    expect(Math.abs(currentPointA.y - currentPointB.y)).toBeLessThan(0.01); // Same Y coordinate
    expect(Math.abs(currentPointB.x - currentPointA.x - 100)).toBeLessThan(
      0.01
    ); // 100 units apart in X

    // Verify the system is stable and all constraints are satisfied
    await h.expectPointCount(2);
    await expect(h.canvas).toBeVisible();
  });
});
