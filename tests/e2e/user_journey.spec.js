const { test, expect } = require('@playwright/test');

test.describe('User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Page loads and map is visible', async ({ page }) => {
    await expect(page).toHaveTitle(/Western Australia/);
    await expect(page.locator('#map')).toBeVisible();
    // Check that Leaflet has initialized by looking for the leaflet-container class
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('Drawer opens initially or exists', async ({ page }) => {
     // Check that the drawer is present
     const drawer = page.locator('#info-drawer');
     await expect(drawer).toBeVisible();
  });

  test('Clicking a marker opens details', async ({ page }) => {
    // Wait for markers to appear
    const marker = page.locator('.custom-marker').first();
    await marker.waitFor({ state: 'visible' });

    // Click the marker
    await marker.click();

    // Drawer should show details
    const detailView = page.locator('#detail-view');
    await expect(detailView).toBeVisible();

    const h2 = detailView.locator('h2');
    await expect(h2).not.toBeEmpty();
  });

  test('Clicking list item opens details', async ({ page }) => {
      const listItem = page.locator('#location-list li').first();
      // Only get the text from the first span (the name), ignoring the arrow
      const locationName = await listItem.locator('span').first().textContent();

      await listItem.click();

      const detailView = page.locator('#detail-view');
      await expect(detailView).toBeVisible();
      await expect(detailView.locator('h2')).toHaveText(locationName);
  });

  test('Close button closes drawer', async ({ page }) => {
      // Ensure drawer is active (it is by default in this app logic, or after click)
      const drawer = page.locator('#info-drawer');
      await expect(drawer).toHaveClass(/active/);

      await page.locator('#close-drawer').click();

      await expect(drawer).not.toHaveClass(/active/);
  });
});
