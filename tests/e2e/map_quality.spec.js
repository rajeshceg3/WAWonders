const {test,expect}=require('@playwright/test');
const names=['Karijini National Park','Ningaloo Reef','The Pinnacles, Nambung','Wave Rock, Hyden','Rottnest Island','Bungle Bungle Range','Lucky Bay, Esperance','Fremantle Prison','Margaret River','Cable Beach, Broome','Valley of the Giants','Horizontal Falls','Kings Park and Botanic Garden','Gibb River Road','Monkey Mia','Kalbarri National Park','The Bell Tower','Hutt Lagoon (Pink Lake)',"Albany's Historic Whaling Station",'Walpole-Nornalup National Park','Cape Le Grand National Park'];
for(const motion of ['reduce','no-preference'])for(const width of [320,390,1440])test(`${width}px ${motion}: all 21 details, two themes and map controls`,async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://tile.openstreetmap.org/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6pL8AAAAASUVORK5CYII=','base64')}));
 await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:motion});await page.addInitScript(()=>{try{localStorage.setItem('wawonders-chrome-pin','1')}catch{}});await page.goto('./');await expect(page.locator('#location-list li')).toHaveCount(21);
 await expect(page.locator('#info-drawer')).toHaveClass(/active/);
 for(const selector of ['#browse-toggle','#reset-map','#tour-toggle','#theme-toggle','#audio-toggle','#location-search']){const r=await page.locator(selector).boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width+.1);expect(r.height).toBeGreaterThanOrEqual(44);}
 await page.screenshot({path:`verification/current/${width}-${motion}-map.png`});
 for(const theme of ['dark','light']){
  if(theme==='light')await page.click('#theme-toggle');
  for(let i=0;i<names.length;i++){
   const li=page.locator('#location-list li').filter({hasText:names[i]});await li.press('Enter');await expect(page.locator('#detail-view h2')).toHaveText(names[i]);await expect(page.locator('#detail-view')).toBeVisible();
   await expect(page.locator('#detail-view img')).toHaveCount(0);await expect(page.locator('.detail-weather')).toHaveCount(0);await expect(page.locator('.planning-note')).toBeVisible();
   await expect.poll(()=>page.locator('#detail-view').evaluate(el=>el.scrollTop)).toBe(0);
   await page.screenshot({path:`verification/current/${width}-${motion}-${theme}-${i}.png`});await page.click('.back-button');
  }
 }
 await page.fill('#location-search','Ningaloo');await expect(page.locator('#location-list li:visible')).toHaveCount(1);await page.fill('#location-search','zzzz');await expect(page.locator('#location-list li:visible')).toHaveCount(0);await page.fill('#location-search','');await expect(page.locator('#location-list li:visible')).toHaveCount(21);
 await page.click('#close-drawer');await expect(page.locator('#info-drawer')).not.toHaveClass(/active/);await page.click('#browse-toggle');await expect(page.locator('#info-drawer')).toHaveClass(/active/);
 await page.click('#audio-toggle');await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed','true');await page.click('#audio-toggle');await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed','false');
 await page.click('#tour-toggle');await expect(page.locator('#tour-toggle')).toHaveText('Stop tour');
 await expect(page.locator('#cinematic-title')).toBeVisible();
 await expect(page.locator('#tour-place-name')).toHaveText(names[0]);await expect(page.locator('#tour-place-count')).toHaveText('1 / 21');
 await page.click('#tour-next');await expect(page.locator('#tour-place-name')).toHaveText(names[1]);await expect(page.locator('#tour-place-count')).toHaveText('2 / 21');await expect(page.locator('#tour-auto')).toBeVisible();
 await page.screenshot({path:`verification/current/${width}-${motion}-tour.png`});
 await page.click('#tour-prev');await expect(page.locator('#tour-place-name')).toHaveText(names[0]);await expect(page.locator('#tour-place-count')).toHaveText('1 / 21');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#tour-place-name')).toHaveText(names[1]);
 await page.click('#tour-auto');await expect(page.locator('#tour-auto')).toBeHidden();
 await page.click('#tour-toggle');await expect(page.locator('#tour-toggle')).toHaveText('Start tour');await expect(page.locator('#cinematic-title')).toBeHidden();await page.click('#reset-map');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
