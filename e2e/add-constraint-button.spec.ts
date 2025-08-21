import { test, expect } from '@playwright/test';
import { GeoCalcTestHelper } from './test-helpers';

test.describe('Add Constraint Button', () => {
  test('+ button in toolbar shows constraint menu', async ({ page }) => {
    const helper = new GeoCalcTestHelper(page);
    await helper.goto();

    // Create two points first
    await helper.createPointAt(200, 200);
    await helper.createPointAt(300, 300);
    await helper.expectPointCount(2);

    // Select both points
    await helper.selectTool('select');
    await helper.canvas.click({ position: { x: 200, y: 200 } });
    await helper.canvas.click({ position: { x: 300, y: 300 }, modifiers: ['Shift'] });

    // Click the + button in the toolbar
    const addConstraintButton = page.locator('[data-testid="add-constraint"]');
    await expect(addConstraintButton).toBeVisible();
    await addConstraintButton.click();

    // Should show distance constraint options
    await expect(page.locator('text=Fixed Distance')).toBeVisible();
    await expect(page.locator('text=Fixed X Distance')).toBeVisible();
    await expect(page.locator('text=Fixed Y Distance')).toBeVisible();
  });

  test('+ button works with no selection', async ({ page }) => {
    const helper = new GeoCalcTestHelper(page);
    await helper.goto();

    // Create a point but don't select it
    await helper.createPointAt(200, 200);
    await helper.expectPointCount(1);
    
    // Switch to select tool but don't select anything
    await helper.selectTool('select');

    // Click the + button in the toolbar
    const addConstraintButton = page.locator('[data-testid="add-constraint"]');
    await addConstraintButton.click();

    // Should show "No constraints available" since nothing is selected
    await expect(page.locator('text=No constraints available')).toBeVisible();
  });

  test('can create constraint from + button menu', async ({ page }) => {
    const helper = new GeoCalcTestHelper(page);
    await helper.goto();

    // Create two points
    await helper.createPointAt(200, 200);
    await helper.createPointAt(300, 300);
    await helper.expectPointCount(2);

    // Select both points
    await helper.selectTool('select');
    await helper.canvas.click({ position: { x: 200, y: 200 } });
    await helper.canvas.click({ position: { x: 300, y: 300 }, modifiers: ['Shift'] });

    // Click the + button and create a distance constraint
    const addConstraintButton = page.locator('[data-testid="add-constraint"]');
    await addConstraintButton.click();
    await page.locator('text=Fixed Distance').click();

    // Verify constraint was created
    await helper.expectConstraintCount(1);
    
    // Check constraint panel shows the constraint
    const constraintPanel = page.locator('[data-testid="constraint-panel"]');
    await expect(constraintPanel.locator('text=distance')).toBeVisible();
  });
});