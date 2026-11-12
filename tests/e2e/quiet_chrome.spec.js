const {test,expect}=require('@playwright/test');
test('quiet chrome retires, wakes on hint, pins', async ({page})=>{
 await page.goto('./');
 // chrome greets visible, then retires
 await expect(page.locator('.top-controls')).toBeVisible();
 await page.waitForTimeout(3200);
 await expect(page.locator('.chrome-hint')).toBeVisible();
 const op=await page.locator('.top-controls').evaluate(e=>getComputedStyle(e).opacity);
 expect(Number(op)).toBe(0);
 // hint wakes
 await page.locator('.chrome-hint').dispatchEvent('click');
 await expect(page.locator('.top-controls')).toBeVisible();
 // pin keeps it
 await page.locator('#pin-controls').click();
 await expect(page.locator('#pin-controls')).toHaveAttribute('aria-pressed','true');
 await page.reload();
 await page.waitForTimeout(3200);
 await expect(page.locator('.top-controls')).toBeVisible();
});
test('reduced motion: no chrome transitions', async ({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('./');
 const t=await page.locator('.top-controls').evaluate(e=>getComputedStyle(e).transitionDuration);
 expect(t).toBe('0s');
});
