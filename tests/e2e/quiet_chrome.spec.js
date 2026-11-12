const {test,expect}=require('@playwright/test');
test('quiet chrome retires, wakes on hint, pins', async ({page})=>{
 await page.goto('./');
 // chrome greets visible, then retires; the open drawer suppresses the hint
 await expect(page.locator('.top-controls')).toBeVisible();
 await expect.poll(()=>page.locator('.top-controls').evaluate(e=>getComputedStyle(e).opacity),{timeout:6000}).toBe('0');
 await expect(page.locator('.chrome-hint')).toBeHidden();
 await page.click('#close-drawer');
 await expect(page.locator('.chrome-hint')).toBeVisible();
 // hint wakes
 await page.locator('.chrome-hint').dispatchEvent('click');
 await expect(page.locator('.top-controls')).toBeVisible();
 // pin keeps it
 await page.locator('#pin-controls').click();
 await expect(page.locator('#pin-controls')).toHaveAttribute('aria-pressed','true');
 await page.reload();
 await page.click('#close-drawer');
 await page.waitForTimeout(3200);
 await expect(page.locator('.top-controls')).toBeVisible();
});
test('reduced motion: no chrome transitions', async ({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('./');
 const t=await page.locator('.top-controls').evaluate(e=>getComputedStyle(e).transitionDuration);
 expect(t).toBe('0s');
});

test('hint never overlaps text or links (320/390)', async ({page})=>{
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});
  await page.goto('./');
  await page.waitForTimeout(3200);
  // drawer open by default: hint must stay out of the drawer's way entirely
  expect(await page.locator('.chrome-hint').isHidden()).toBe(true);
  await page.click('#close-drawer');
  await page.waitForTimeout(300);
  const hint=await page.locator('.chrome-hint').boundingBox();
  expect(hint).toBeTruthy();
  // no text/link/control rect may intersect the hint
  const hits=await page.evaluate((h)=>{
   const bad=[];
   const inter=(r)=>!(r.right<h.x||r.left>h.x+h.width||r.bottom<h.y||r.top>h.y+h.height);
   for(const el of document.querySelectorAll('a,p,li,h1,h2,h3,span,.leaflet-control-attribution')){
    const r=el.getBoundingClientRect();
    if(r.width&&r.height&&inter(r)&&getComputedStyle(el).visibility!=='hidden')bad.push(el.className||el.tagName);
   }
   return bad;
  },hint);
  expect(hits).toEqual([]);
 }
});
