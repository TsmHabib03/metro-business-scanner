import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chromium',headless:true});
const results=[];
await mkdir('.impeccable/review',{recursive:true});
try {
 for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  for(const mock of [false,true]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   const errors=[];let tileRequests=0;
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://tile.openstreetmap.org/**',r=>{tileRequests++;return r.abort();});
   let fixture,started=false;
   if(mock){
    const scan=(await(await fetch('http://127.0.0.1:3001/api/scans')).json()).find(s=>s.state==='completed');
    fixture={...scan,id:'9bc7b222-3cbb-4c33-af94-b6c9a2f75472',scope:{city:'Quezon City',category:'dental',limit:100},state:'running',stage:'Preparing local data: indexing installed OSM extract (one-time)',stored:0,found:0,cancel_requested:false,created_at:new Date(Date.now()-65000).toISOString(),started_at:new Date(Date.now()-65000).toISOString(),finished_at:null};
    await page.route('**/api/scans',async r=>{
     if(r.request().method()==='POST'){started=true;await r.fulfill({status:202,json:fixture});}
     else await r.fulfill({json:started?[fixture]:[]});
    });
    await page.route('**/api/scans/*/cancel',r=>{fixture.cancel_requested=true;return r.fulfill({json:{ok:true}});});
   }
   await page.goto('http://127.0.0.1:5173/?city=Makati&category=dental&website=available&status=saved&search=unlikely-search&district=unlikely-district&barangay=unlikely-barangay');
   await page.getByLabel('City / municipality').selectOption('Quezon City');
   await page.getByLabel('Business category').selectOption('dental');
   const startedAt=Date.now();
   await page.getByRole('button',{name:'Start discovery scan',exact:true}).click();
   if(mock){
    await page.locator('.active-scan').getByText('The first local index takes a few minutes.',{exact:false}).waitFor();
    assert.match(await page.locator('.active-scan').innerText(),/1m \d+s elapsed/);
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:`.impeccable/review/scan-${name}-preparation.png`,fullPage:true});
    await page.locator('.active-scan').getByRole('button',{name:'Cancel',exact:true}).click();
    const cancelling=page.locator('.active-scan').getByRole('button',{name:'Cancelling…',exact:true});
    await cancelling.waitFor();assert.equal(await cancelling.isDisabled(),true);
    fixture.state='cancelled';fixture.stage='Cancelled; stored results retained';
    await page.getByRole('status').filter({hasText:'Scan cancelled. Saved records are retained.'}).waitFor();
    assert.equal(await page.locator('.active-scan').count(),0);
   }else{
    await page.getByRole('status').filter({hasText:'Scan complete: 100 records saved for Quezon City.'}).waitFor({timeout:15000});
    const links=page.locator(width<620?'.mobile-record':'.record-link');await links.first().waitFor();
    assert.equal(await links.count(),50);
    assert.equal(await page.getByLabel('Search discovered businesses').inputValue(),'');
    const url=new URL(page.url());for(const key of ['website','status','search','district','barangay'])assert.equal(url.searchParams.has(key),false);
    assert.equal(url.searchParams.get('city'),'Quezon City');
    assert.equal(await page.locator('.active-scan').count(),0);
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:`.impeccable/review/scan-${name}-completed.png`,fullPage:true});
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);assert.equal(tileRequests,0);
   results.push({name,mockPreparation:mock,observedMs:Date.now()-startedAt,errors,overflow:false,tileRequests,checks:mock?['stage','elapsed time','preparation explanation','cancel disabled while pending','terminal cancellation']:['real scan','completion message','stale filters cleared','50 visible results','no active scan after completion']});
   await page.close();
  }
 }
 await writeFile('docs/validation/scan-speed-browser-result.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
