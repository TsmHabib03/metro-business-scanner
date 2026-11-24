import { db } from './db.ts';
import { compileQuery, geography, overpass, storeElement } from './discovery.ts';
import type { Scope } from '../shared/catalog.ts';
import { hasExtract,localBundle,localMatches } from './local-source.ts';
const controllers=new Map<string,AbortController>();
let ticking=false;
export function cancelScan(id:string) {controllers.get(id)?.abort();}
export async function work() {
 if(ticking)return; ticking=true; let id:string|undefined;
 try {
  const claim=await db.query(`UPDATE scans SET state='running',started_at=now(),attempts=attempts+1,stage='Verifying area' WHERE id=(SELECT id FROM scans WHERE state='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`);
  if(!claim.rowCount)return;
  const scan=claim.rows[0]; id=scan.id; const scope=scan.scope as Scope;
  const controller=new AbortController();controllers.set(id!,controller);
  await db.query('UPDATE scans SET transport=$2 WHERE id=$1',[id,await hasExtract()?'local_extract':'overpass']);
  let updates=Promise.resolve();
  const progress=(stage:string)=>{updates=updates.then(async()=>{await db.query("UPDATE scans SET stage=$2 WHERE id=$1 AND state='running'",[id,stage]);}).catch(error=>console.error('Scan progress update failed',error));};
  let geo;
  try{geo=await geography(scope.city,controller.signal,progress);}finally{await updates;}
  if(scope.areaId && !geo.areas.some(a=>a.id===scope.areaId))throw new Error('The selected area is not in the verified city boundary.');
  const relationId=scope.areaId||geo.relationId;
  await db.query("UPDATE scans SET boundary_id=$2,transport=$3,stage='Discovering businesses' WHERE id=$1",[id,relationId,geo.transport]);
  const bundle=geo.transport==='local_extract'?await localBundle(scope.city,controller.signal):null;
  const data=bundle?{elements:localMatches(bundle,scope),osm3s:{timestamp_osm_base:bundle.source.dataTimestamp}}:await overpass(compileQuery(scope,relationId),'business discovery',controller.signal);
  await db.query("UPDATE scans SET found=$2,source_timestamp=$3,stage='Saving source evidence' WHERE id=$1",[id,data.elements.length,data.osm3s?.timestamp_osm_base||null]);
  let stored=0;
  for(const e of data.elements.slice(0,scope.limit)) {
   const current=await db.query('SELECT cancel_requested FROM scans WHERE id=$1',[id]);
   if(controller.signal.aborted||current.rows[0].cancel_requested)throw new Error('Scan cancelled.');
   if(await storeElement(e,scope,id!))stored++;
   await db.query('UPDATE scans SET stored=$2 WHERE id=$1',[id,stored]);
  }
  await db.query("UPDATE scans SET state=CASE WHEN cancel_requested THEN 'cancelled' ELSE 'completed' END,stage=CASE WHEN cancel_requested THEN 'Cancelled; stored results retained' ELSE 'Complete' END,finished_at=now() WHERE id=$1",[id]);
 } catch(e) {
  if(id)await db.query("UPDATE scans SET state=CASE WHEN cancel_requested THEN 'cancelled' ELSE 'failed' END,stage=CASE WHEN cancel_requested THEN 'Cancelled; stored results retained' ELSE 'Scan failed' END,error=$2,finished_at=now() WHERE id=$1",[id,e instanceof Error?(e.name==='TimeoutError'||e.name==='AbortError'?'Discovery source did not respond in time. Retry later or install the local OSM extract.':e.message):'Unexpected scan failure']);
  else console.error(e);
 } finally { if(id)controllers.delete(id);ticking=false; }
}
export async function startWorker() {
 // Interrupted requests can be safely retried: OSM identity deduplicates writes.
 await db.query("UPDATE scans SET state=CASE WHEN cancel_requested THEN 'cancelled' ELSE 'queued' END,stage='Resuming after restart' WHERE state='running'");
 return setInterval(()=>void work(),1000);
}
