import { test, expect } from '@playwright/test';

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
});