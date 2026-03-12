const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // The preview server should be running on port 4173 based on npm run preview defaults
  await page.goto('http://localhost:4173');

  // Wait for the drawer to be active
  await page.waitForSelector('#info-drawer.active');

  // Take a screenshot of the initial state (dark mode, list view)
  await page.screenshot({ path: '/home/jules/verification/initial_dark.png' });

  // Type in the search input
  const searchInput = await page.locator('#location-search');
  await searchInput.fill('Ningaloo');

  // Wait a bit for the filter to apply (it's synchronous but DOM update might take a tick)
  await page.waitForTimeout(500);

  // Take a screenshot showing the filtered list
  await page.screenshot({ path: '/home/jules/verification/search_filtered.png' });

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(500);

  // Click a location to open the detail view
  const locationItem = await page.locator('#location-list li[data-id="desert"]'); // Let's try to click Pinnacles which is a desert
  // Actually, we don't know the exact IDs from the script easily, let's just click the first visible one
  const firstItem = await page.locator('#location-list li').first();
  await firstItem.click();

  // Wait for detail view to become visible
  await page.waitForSelector('#detail-view.visible');
  await page.waitForTimeout(1000); // Wait for animations (slide + particles) to settle a bit

  // Take a screenshot of the detail view in dark mode
  await page.screenshot({ path: '/home/jules/verification/detail_dark.png' });

  // Click the theme toggle
  const themeToggle = await page.locator('#theme-toggle');
  await themeToggle.click();

  // Wait a bit for CSS transitions
  await page.waitForTimeout(500);

  // Take a screenshot of the detail view in light mode
  await page.screenshot({ path: '/home/jules/verification/detail_light.png' });

  await browser.close();
})();
