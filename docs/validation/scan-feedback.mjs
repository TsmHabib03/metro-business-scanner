import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

// Browser-only lifecycle fixtures: no scans or business writes reach the API.
const browser=await chromium.launch({channel:'chromium',headless:true});
const results=[];
try {
 for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
  let scan,submitted,cancelled=false;
  await page.route('**/api/scans',async route=>{
   if(route.request().method()==='POST') {
    submitted=route.request().postDataJSON();
    await new Promise(resolve=>setTimeout(resolve,500));
    scan={id:'00000000-0000-4000-8000-000000000099',scope:submitted,state:'running',stage:'Reading local city bundle',found:12,stored:7,attempts:1,transport:'local_extract',created_at:new Date(Date.now()-3000).toISOString(),started_at:new Date(Date.now()-3000).toISOString(),finished_at:null,error:null,boundary_id:'TEST',source_timestamp:null,cancel_requested:false};
    return route.fulfill({json:scan});
   }
   return route.fulfill({json:scan?[scan]:[]});
  });
  await page.route('**/api/scans/*/cancel',async route=>{
   cancelled=true;scan={...scan,cancel_requested:true,stage:'Stopping discovery'};
   await new Promise(resolve=>setTimeout(resolve,250));
   return route.fulfill({json:{ok:true}});
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button',{name:'New scan',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'New discovery scan'});
  await drawer.getByLabel('Business category').selectOption('dental');
  await drawer.getByLabel('Maximum records').selectOption('25');
  const start=drawer.getByRole('button',{name:'Start discovery scan',exact:true});
  await start.click();await page.locator('.scan-button .spin').waitFor();assert.ok(await start.isDisabled());
  await drawer.waitFor({state:'hidden'});const active=page.locator('.active-scan');await active.waitFor();
  assert.match(await active.innerText(),/Reading local city bundle.*elapsed.*7 records saved/s);
  assert.deepEqual(submitted,{city:'Makati',category:'dental',limit:25,customKey:'shop'});
  assert.ok(new URL(page.url()).searchParams.get('category')==='dental');
  assert.ok(await active.locator('.spin').isVisible());
  // Verify a genuine later stage/count is rendered by the poll, without invented percentages.
  scan={...scan,stage:'Saving discovered records',stored:12};
  await active.getByText(/Saving discovered records.*12 records saved/).waitFor();
  await active.getByRole('button',{name:'Cancel',exact:true}).click();
  await active.getByRole('button',{name:'Cancelling…',exact:true}).waitFor();assert.ok(cancelled);
  scan={...scan,state:'cancelled',stage:'Cancelled',finished_at:new Date().toISOString()};
  await active.waitFor({state:'hidden'});
  await page.getByRole('status').filter({hasText:'Scan cancelled. Saved records are retained.'}).waitFor();
  await page.getByRole('button',{name:'Scan history',exact:true}).click();
  await page.locator('.scan-row').filter({hasText:'Cancelled'}).waitFor();
  assert.ok(await page.getByRole('button',{name:'Retry',exact:true}).isEnabled());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  results.push({device,browserOnlyFixtures:true,checks:['bounded scope submission','start spinner and duplicate prevention','actual stage, elapsed and saved count','stage/count polling','cancel pending and completion','history retry available','no horizontal overflow'],errors});
  await page.close();
 }
 await writeFile('docs/validation/scan-feedback-result.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
 console.log(JSON.stringify(results));
} finally {await browser.close();}
