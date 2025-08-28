import { test, expect } from '@playwright/test';
import { TestHarness } from './test-helpers';

test.describe('Add Constraint Button', () => {
  test('+ button in toolbar shows constraint menu', async ({ page }) => {
    const h = new TestHarness(page);
    await h.goto();

    // Create two points first
    await h.createPointAt(200, 200);
    await h.createPointAt(300, 300);
    await h.expectPointCount(2);

    // Select both points using entity panel (more reliable than canvas selection)
    await h.selectTool('select');
    await h.selectPointsInPanel([0, 1], true);

    // Click the + button in the toolbar
    const addConstraintButton = page.locator('[data-testid="add-constraint"]');
    await expect(addConstraintButton).toBeVisible();
    await addConstraintButton.click();

    // Should show distance constraint options (use exact match to avoid conflicts)
    await expect(page.getByRole('button', { name: 'Distance', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'X Distance' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Y Distance' })).toBeVisible();
  });

  test('+ button works with no selection', async ({ page }) => {
    const h = new TestHarness(page);
    await h.goto();

    // Create a point but don't select it
    await h.createPointAt(200, 200);
    await h.expectPointCount(1);
    
    // Switch to select tool but don't select anything
    await h.selectTool('select');

    // Click the + button in the toolbar
    const addConstraintButton = page.locator('[data-testid="add-constraint"]');
    await addConstraintButton.click();

    // Should show "No constraints available" since nothing is selected
    await expect(page.locator('text=No constraints available')).toBeVisible();
  });

  test('can create constraint from + button menu', async ({ page }) => {
    const h = new TestHarness(page);
    await h.goto();

    // Create two points
    await h.createPointAt(200, 200);
    await h.createPointAt(300, 300);
    await h.expectPointCount(2);

    // Select both points using entity panel (more reliable)
    await h.selectTool('select');
    await h.selectPointsInPanel([0, 1], true);

    // Click the + button and create a distance constraint
    const addConstraintButton = page.locator('[data-testid="add-constraint"]');
    await addConstraintButton.click();
    await page.getByRole('button', { name: 'Distance', exact: true }).click();
    
    // Handle value input dialog for distance constraint
    const numberInput = page.locator('input[type="number"]');
    if (await numberInput.isVisible()) {
      await numberInput.fill('100');
      await page.locator('button').filter({ hasText: 'Create' }).click();
    }

    // Verify constraint was created
    await h.expectConstraintCount(1);
    
    // Check constraint panel shows the constraint
    await expect(h.constraintPanel.locator('text=distance')).toBeVisible();
  });
});