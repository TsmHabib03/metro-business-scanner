import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3001/api';
const get=async path=>{const r=await fetch(base+path);assert.ok(r.ok);return r.json();};
const map=await get('/map-features');const list=await get('/businesses');assert.ok(map.features.length>50);assert.equal(list.rows.length,50);assert.equal(map.total,list.total);
const empire=(await get('/businesses?search=Empire')).rows.find(r=>r.name==='Empire Dental PH');assert.ok(empire.social_links.length>=2);
const browser=await chromium.launch({channel:'chromium',headless:true});await mkdir('.impeccable/review',{recursive:true});const results=[];
try{
 for(const [name,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
  await page.goto('http://127.0.0.1:5173/');await page.locator('.map[data-loaded-points]').waitFor();if(width<620)await page.getByRole('button',{name:'Expand list'}).click();await page.locator('.mobile-record').first().waitFor();
  assert.equal(Number(await page.locator('.map').getAttribute('data-loaded-points')),map.features.length);
  if(width<620)await page.getByRole('button',{name:'Collapse list'}).click();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`.impeccable/review/${name}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByRole('dialog',{name:'Record filters'}).getByLabel('Website opportunity').selectOption('social_only');await page.getByRole('button',{name:'Close configuration'}).click();
  await page.waitForResponse(r=>r.url().includes('/api/map-features')&&r.url().includes('website=social_only'));await page.getByRole('button',{name:'Filters',exact:false}).click();await page.getByRole('dialog',{name:'Record filters'}).getByLabel('Website opportunity').selectOption('');await page.getByRole('button',{name:'Close configuration'}).click();
  await page.goto(`http://127.0.0.1:5173/?selected=${empire.id}`);
  // Select the record through its list to open the protected record drawer.
  await page.getByLabel('Search discovered businesses').fill('Empire');if(width<620)await page.getByRole('button',{name:'Expand list'}).click();await page.locator('.mobile-record').filter({hasText:'Empire Dental PH'}).click();
  const detail=page.getByRole('dialog',{name:'Business evidence'});await detail.getByRole('heading',{name:empire.name,exact:true}).waitFor();assert.ok(await detail.locator('.social-link').count()>=2);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`.impeccable/review/${name}-evidence.png`,fullPage:false});
  await detail.getByLabel('Your notes').fill('Unsaved QA draft');await page.getByRole('button',{name:'Close business record'}).click();await page.locator('.mobile-record').filter({hasText:'Empire Dental PH'}).click();assert.equal(await detail.getByLabel('Your notes').inputValue(),'Unsaved QA draft');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'New scan'}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`.impeccable/review/${name}-scan.png`,fullPage:false});await page.keyboard.press('Escape');
  await page.route('**/api/businesses?**',async r=>{await new Promise(resolve=>setTimeout(resolve,700));await r.continue();});await page.getByLabel('Search discovered businesses').fill('Dental');await page.locator('.result-skeleton').waitFor();await page.screenshot({path:`.impeccable/review/${name}-loading.png`,fullPage:true});await page.locator('.result-skeleton').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);results.push({name,points:map.features.length,profiles:empire.social_links.length,errors});await page.close();
 }
 await writeFile('docs/validation/map-workflow-result.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
