import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base='http://127.0.0.1:3001/api';
async function api(path,body,method=body?'POST':'GET'){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const value=await response.json();assert.ok(response.ok,JSON.stringify(value));return value;}
const source=await api('/sources');assert.equal(source.transport,'local_extract');
const geo=await api('/geography?city=Makati');assert.equal(geo.relationId,103716);
const scan=await api('/scans',{city:'Makati',category:'dental',limit:25});
let finished;
for(let i=0;i<60;i++){finished=(await api('/scans')).find(s=>s.id===scan.id);if(['completed','failed','cancelled'].includes(finished.state))break;await new Promise(r=>setTimeout(r,1000));}
assert.equal(finished.state,'completed',JSON.stringify(finished));assert.ok(finished.stored>0);assert.ok(finished.stored<=25);
const records=await api('/businesses?city=Makati&category=dental');assert.equal(records.total,finished.stored);
const first=records.rows[0];const original={status:first.prospect_status,notes:first.notes};
await api('/businesses/'+first.id,{status:'saved',notes:'Pilot validation note ? restored after verification.'},'PATCH');
const saved=await api('/businesses?saved=true');assert.ok(saved.rows.some(r=>r.id===first.id));
await api('/businesses/'+first.id,original,'PATCH');
const csv=await fetch(base+'/export?city=Makati&category=dental&format=csv');assert.ok(csv.ok);const text=await csv.text();assert.match(text,/OpenStreetMap contributors/);assert.match(text,/opendatacommons/);
const excel=await fetch(base+'/export?city=Makati&category=dental&format=xlsx');assert.ok(excel.ok);assert.ok((await excel.arrayBuffer()).byteLength>1000);
const queued=await api('/scans',{city:'Makati',category:'dental',limit:25});await api('/scans/'+queued.id+'/cancel',{});
await new Promise(r=>setTimeout(r,1500));const cancelled=(await api('/scans')).find(s=>s.id===queued.id);assert.equal(cancelled.state,'cancelled');
const report={source:source.operator,sourceTimestamp:finished.source_timestamp,scanId:scan.id,stored:finished.stored,geoAreas:geo.areas.length,websiteStates:records.rows.reduce((a,r)=>(a[r.website_status]=(a[r.website_status]||0)+1,a),{}),checks:['real scan','geography','save and restore prospect','CSV attribution','Excel','cancel queued scan']};
await writeFile('docs/validation/pilot-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
