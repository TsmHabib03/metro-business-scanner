import Fastify from 'fastify';
import staticPlugin from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { db } from './db.ts';
import { migrate } from './migrate.ts';
import { policy,localPolicy,enforcePolicy,enforceLocalPolicy } from './policy.ts';
import { hasExtract } from './local-source.ts';
import { scopeSchema,geography } from './discovery.ts';
import { startWorker,cancelScan,work } from './worker.ts';
import { checkWebsite } from './website.ts';
import { csv,xlsx,licenseNotice } from './export.ts';
import { cities } from '../shared/catalog.ts';
import { businessFilters as filters,presentBusiness } from './business-query.ts';
import {installAccess} from './access.ts';
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3001);
if(!process.env.PUBLIC_ORIGIN&&!['127.0.0.1','localhost','::1'].includes(host))throw new Error('Remote access requires PUBLIC_ORIGIN and private access credentials.');
await migrate();
const app=Fastify({logger:true,bodyLimit:32768});
installAccess(app,port);
app.setErrorHandler((error,req,reply)=>{const e=error as Error & {statusCode?:number};req.log.error(e);reply.code(e instanceof z.ZodError?400:e.statusCode||400).send({error:e instanceof z.ZodError?e.issues.map(i=>i.message).join(' '):e.message});});
app.get('/api/health',async()=>({ok:true,database:!!(await db.query('SELECT 1')).rowCount}));
async function activePolicy(){if(await hasExtract()){enforceLocalPolicy();return localPolicy;}enforcePolicy(process.env.OVERPASS_ENDPOINT||policy.endpoint);return policy;}
app.get('/api/sources',async()=>{const local=await hasExtract();let enabled=true,reason=local?'Bounded discovery uses the downloaded OSM extract. No network requests per scan.':'Bounded online discovery is enabled; the operator may be unavailable.';try{await activePolicy();}catch(e){enabled=false;reason=(e as Error).message;}const usage=await db.query("SELECT count(*)::int AS count FROM source_requests WHERE requested_at>now()-interval '24 hours'");return {...(local?localPolicy:policy),transport:local?'local_extract':'overpass',privacy:process.env.PUBLIC_ORIGIN?(local?'Discovery reads the OSM extract on your private server. Notes, statuses and business records stay in its database. Extract downloads contact Geofabrik.':'Area/category queries contact Private.coffee, which may retain request metadata for up to 48 hours. Notes and statuses stay in your private server database.'):(local?localPolicy:policy).privacy,enabled,reason,usedRequests:local?0:usage.rows[0].count,google:{enabled:false,reason:'Google Places is not connected. Its standard storage, export and map restrictions need a separate verified integration for this persistent prospecting workflow.'}};});
app.get('/api/geography',async(req)=>{const city=z.enum(cities).parse((req.query as Record<string,string>).city);return geography(city);});
app.get('/api/scans',async()=> (await db.query('SELECT * FROM scans ORDER BY created_at DESC LIMIT 100')).rows);
app.post('/api/scans',async(req,reply)=>{
 await activePolicy();const scope=scopeSchema.parse(req.body);
 const client=await db.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7249102)');
 if((await client.query("SELECT id FROM scans WHERE state IN ('queued','running')")).rowCount)throw new Error('A scan is already active. Wait for it to finish or cancel it.');
 const result=await client.query('INSERT INTO scans(scope,transport) VALUES($1,$2) RETURNING *',[JSON.stringify(scope),await hasExtract()?'local_extract':'overpass']);await client.query('COMMIT');void work();return reply.code(202).send(result.rows[0]);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
});
app.post('/api/scans/:id/cancel',async(req)=>{const id=z.uuid().parse((req.params as {id:string}).id);await db.query("UPDATE scans SET cancel_requested=true,state=CASE WHEN state='queued' THEN 'cancelled' ELSE state END,stage=CASE WHEN state='queued' THEN 'Cancelled' ELSE stage END,finished_at=CASE WHEN state='queued' THEN now() ELSE finished_at END WHERE id=$1 AND state IN ('queued','running')",[id]);cancelScan(id);return {ok:true};});
app.post('/api/scans/:id/retry',async(req)=>{await activePolicy();const id=z.uuid().parse((req.params as {id:string}).id);const client=await db.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7249102)');if((await client.query("SELECT 1 FROM scans WHERE state IN ('queued','running')")).rowCount)throw new Error('A scan is already active.');const result=await client.query("UPDATE scans SET state='queued',stage='Waiting for retry',error=NULL,cancel_requested=false,finished_at=NULL WHERE id=$1 AND state IN ('failed','cancelled') RETURNING id",[id]);if(!result.rowCount)throw new Error('Only failed or cancelled scans can be retried.');await client.query('COMMIT');return {ok:true};}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}});
const businessSelect="SELECT b.*,coalesce(p.status,'new') AS prospect_status,coalesce(p.notes,'') AS notes FROM businesses b LEFT JOIN prospects p ON p.business_id=b.id";
app.get('/api/businesses',async(req)=>{const q=req.query as Record<string,string>;const f=filters(q);const page=Math.max(1,Math.min(10000,Number(q.page)||1));const sort=q.sort==='name'?'b.name ASC':q.sort==='recent'?'b.updated_at DESC':"CASE b.website_status WHEN 'not_listed' THEN 0 WHEN 'social_only' THEN 1 WHEN 'unavailable' THEN 2 WHEN 'review' THEN 3 ELSE 4 END,b.name ASC";
 const count=await db.query('SELECT count(*)::int AS total FROM businesses b LEFT JOIN prospects p ON p.business_id=b.id'+f.where,f.values);
 const rows=await db.query(businessSelect+f.where+` ORDER BY ${sort},b.id LIMIT 50 OFFSET $${f.values.length+1}`,[...f.values,(page-1)*50]);return {rows:rows.rows.map(presentBusiness),total:count.rows[0].total,page};});
app.get('/api/businesses/:id',async(req,reply)=>{const id=z.uuid().parse((req.params as {id:string}).id);const row=(await db.query(businessSelect+' WHERE b.id=$1',[id])).rows[0];if(!row)return reply.code(404).send({error:'Business not found.'});return presentBusiness(row);});
app.get('/api/map-features',async(req)=>{
 const f=filters(req.query as Record<string,string>);
 const counts=(await db.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE b.lat IS NULL OR b.lon IS NULL OR b.lat NOT BETWEEN -90 AND 90 OR b.lon NOT BETWEEN -180 AND 180)::int AS missing_coordinates FROM businesses b LEFT JOIN prospects p ON p.business_id=b.id"+f.where,f.values)).rows[0];
 const suffix=(f.where?' AND ':' WHERE ')+"b.lat BETWEEN -90 AND 90 AND b.lon BETWEEN -180 AND 180";
 const points=(await db.query("SELECT b.id,b.name,b.city,b.website_status,b.lat,b.lon FROM businesses b LEFT JOIN prospects p ON p.business_id=b.id"+f.where+suffix+' ORDER BY b.id LIMIT 10000',f.values)).rows;
 return {type:'FeatureCollection',features:points.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[Number(p.lon),Number(p.lat)]},properties:{id:p.id,name:p.name,city:p.city,website_status:p.website_status}})),...counts,complete:points.length===counts.total-counts.missing_coordinates};
});
app.get('/api/stats',async()=> (await db.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE website_status='not_listed')::int AS not_listed,count(*) FILTER(WHERE website_status='social_only')::int AS social_only,count(*) FILTER(WHERE checked_at IS NOT NULL)::int AS checked,count(*) FILTER(WHERE p.status NOT IN ('new','dismissed'))::int AS saved FROM businesses b LEFT JOIN prospects p ON p.business_id=b.id")).rows[0]);
app.patch('/api/businesses/:id',async(req)=>{const id=z.uuid().parse((req.params as {id:string}).id);const body=z.object({status:z.enum(['new','saved','contacted','qualified','won','dismissed']),notes:z.string().max(10000)}).parse(req.body);await db.query('INSERT INTO prospects(business_id,status,notes) VALUES($1,$2,$3) ON CONFLICT(business_id) DO UPDATE SET status=$2,notes=$3,updated_at=now()',[id,body.status,body.notes]);return {ok:true};});
let checking=false;
app.post('/api/businesses/:id/check',async(req)=>{if(checking)throw new Error('A website check is already running. Try again in a moment.');const id=z.uuid().parse((req.params as {id:string}).id);const row=(await db.query('SELECT * FROM businesses WHERE id=$1',[id])).rows[0];if(!row)throw new Error('Business not found.');if(!row.website||row.website_status==='social_only')throw new Error('No independent website is listed to check.');checking=true;try{const result=await checkWebsite(row.website);const client=await db.connect();try{await client.query('BEGIN');await client.query('INSERT INTO website_checks(business_id,requested_url,status,reason) VALUES($1,$2,$3,$4)',[id,row.website,result.status,result.reason]);await client.query('UPDATE businesses SET website_status=$2,website_reason=$3,checked_at=now() WHERE id=$1 AND website=$4',[id,result.status,result.reason,row.website]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}return result;}finally{checking=false;}});
app.get('/api/export',async(req,reply)=>{const source=await activePolicy();const q=req.query as Record<string,string>;const f=filters(q);const rows=(await db.query(businessSelect+f.where+' ORDER BY b.name LIMIT 10001',f.values)).rows;if(rows.length>10000)throw new Error('Export limit is 10,000 records. Narrow your filters.');if(q.format==='xlsx'){reply.header('Content-Disposition','attachment; filename="metro-businesses.xlsx"').type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');return xlsx(rows.map(presentBusiness),source.endpoint);}reply.header('Content-Disposition','attachment; filename="metro-businesses.csv"').header('Link',`<${policy.licenseUrl}>; rel="license"`).type('text/csv; charset=utf-8');return csv(rows.map(presentBusiness),source.endpoint);});
app.get('/api/export-license',async(_req,reply)=>reply.header('Content-Disposition','attachment; filename="OSM-LICENSE.txt"').type('text/plain').send(licenseNotice));
const dist=fileURLToPath(new URL('../dist',import.meta.url));if(existsSync(dist)){await app.register(staticPlugin,{root:dist,list:false});app.setNotFoundHandler((req,reply)=>req.url.startsWith('/api/')?reply.code(404).send({error:'Unknown API route'}):reply.sendFile('index.html'));}
await startWorker();await app.listen({host,port});
