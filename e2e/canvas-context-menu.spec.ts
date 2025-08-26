import { test, expect } from '@playwright/test';
import { GeoCalcTestHelper } from './test-helpers';

test.describe('Canvas Context Menu Constraint Creation', () => {
  test('right-click on canvas with selected points shows constraint options', async ({ page }) => {
    const helper = new GeoCalcTestHelper(page);
    await helper.goto();

    // Create two points on canvas
    await helper.selectTool('point');
    await helper.canvas.click({ position: { x: 200, y: 200 } });
    await helper.canvas.click({ position: { x: 300, y: 300 } });
    await helper.expectPointCount(2);

    // Switch to select tool and select both points using entity panel (more reliable)
    await helper.selectTool('select');
    
    // Select both points in the entity panel using shift-click
    await helper.selectPointsInPanel([0, 1], true);

    // Right-click on the first point to show context menu (preserves selection)
    await helper.canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    
    // Should show distance constraint options
    await expect(page.locator('text=Distance')).toBeVisible();
    await expect(page.locator('text=Fixed X Distance')).toBeVisible();
    await expect(page.locator('text=Fixed Y Distance')).toBeVisible();
  });

  test('create distance constraint from canvas context menu', async ({ page }) => {
    const helper = new GeoCalcTestHelper(page);
    await helper.goto();

    // Create two points on canvas
    await helper.selectTool('point');
    await helper.canvas.click({ position: { x: 200, y: 200 } });
    await helper.canvas.click({ position: { x: 300, y: 300 } });
    await helper.expectPointCount(2);

    // Switch to select tool and select both points using entity panel (more reliable)
    await helper.selectTool('select');
    
    // Select both points in the entity panel using shift-click
    await helper.selectPointsInPanel([0, 1], true);

    // Right-click on the first point and create distance constraint
    await helper.canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    await page.locator('text=Distance').click();
    
    // Verify constraint was created
    await helper.expectConstraintCount(1);
    
    // Check constraint panel shows the constraint
    const constraintPanel = page.locator('[data-testid="constraint-panel"]');
    await expect(constraintPanel.locator('text=distance')).toBeVisible();
  });

  test('right-click directly on point shows context menu', async ({ page }) => {
    const helper = new GeoCalcTestHelper(page);
    await helper.goto();

    // Create a single point
    await helper.selectTool('point');
    await helper.canvas.click({ position: { x: 200, y: 200 } });
    await helper.expectPointCount(1);

    // Switch to select tool
    await helper.selectTool('select');
    
    // Right-click directly on the point (should select it and show menu)
    await helper.canvas.click({ button: 'right', position: { x: 200, y: 200 } });
    
    // Should show "No constraints available" for single point
    await expect(page.locator('text=No constraints available')).toBeVisible();
  });
});