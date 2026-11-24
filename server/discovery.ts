import { z } from 'zod';
import { socialLinks, socialPlatform } from '../shared/social.ts';
import { cities, categories, type Scope, type Area } from '../shared/catalog.ts';
import { db } from './db.ts';
import { policy, enforcePolicy } from './policy.ts';
import { localBundle } from './local-source.ts';
import type { Progress } from './preparation.ts';
export const scopeSchema = z.object({ city: z.enum(cities), category: z.enum(['restaurant','dental','clothing','beauty','gym','automotive','school','other','custom']), customKey: z.enum(['shop','amenity','healthcare','leisure','office','craft']).optional(), customValue: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/).optional(), areaId: z.number().int().positive().max(1e12).optional(), limit: z.number().int().min(1).max(200).default(100) }).superRefine((v,ctx)=>{ if(v.category==='custom' && (!v.customKey || !v.customValue)) ctx.addIssue({code:'custom',message:'Custom category needs an OSM key and value.'}); });
interface Element { type: string; id: number; lat?: number; lon?: number; center?: {lat:number;lon:number}; tags?: Record<string,string> }
interface Overpass { elements: Element[]; osm3s?: {timestamp_osm_base?: string}; remark?: string }
let requestTail: Promise<unknown> = Promise.resolve();
export function overpass(query: string, operation: string, signal?: AbortSignal): Promise<Overpass> {
 const task = requestTail.then(async()=> {
  enforcePolicy(process.env.OVERPASS_ENDPOINT || policy.endpoint);
  if (signal?.aborted) throw new Error('Scan cancelled.');
  const count = await db.query("SELECT count(*)::int AS count, max(requested_at) AS last FROM source_requests WHERE requested_at > now()-interval '24 hours'");
  if (count.rows[0].count >= policy.dailyRequests) throw new Error('Daily source budget reached (40 requests). Try tomorrow.');
  const wait = Math.max(0, policy.intervalSeconds*1000 - (Date.now()-new Date(count.rows[0].last || 0).getTime()));
  if(wait) await new Promise<void>((resolve,reject)=> { const t=setTimeout(resolve,wait); signal?.addEventListener('abort',()=>{clearTimeout(t);reject(new Error('Scan cancelled.'));},{once:true}); });
  signal?.throwIfAborted();
  await db.query('INSERT INTO source_requests(operation) VALUES($1)',[operation]);
  const response = await fetch(policy.endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'MetroManilaBusinessScanner/0.1 (local single-user pilot)'},body:new URLSearchParams({data:query}),signal:AbortSignal.any([AbortSignal.timeout(75000), ...(signal?[signal]:[])])});
  if(!response.ok) throw new Error(`Source returned HTTP ${response.status}. Retry this scan later.`);
  const reader=response.body!.getReader(); const chunks: Uint8Array[]=[]; let size=0;
  while(true) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>8_000_000){await reader.cancel();throw new Error('Source response exceeded the 8 MB limit. Choose a smaller area.');} chunks.push(value); }
  const result=JSON.parse(Buffer.concat(chunks).toString('utf8')) as Overpass;
  if(result.remark) throw new Error(`Source query incomplete: ${result.remark.slice(0,300)}`);
  if(!Array.isArray(result.elements)) throw new Error('Invalid response from discovery source.');
  return result;
 });
 requestTail=task.catch(()=>{}); return task;
}
export function compileQuery(scope: Scope, relationId: number) {
 scopeSchema.parse(scope);
 if(!Number.isSafeInteger(relationId)||relationId<1) throw new Error('Invalid verified boundary.');
 const filters: readonly (readonly string[])[] = scope.category==='custom' ? [[scope.customKey!,scope.customValue!]] : categories.find(c=>c.id===scope.category)!.tags;
 return `[out:json][timeout:45][maxsize:8388608];rel(${relationId});map_to_area->.scope;(${filters.map(([k,v])=>`nwr["${k}"${v==='*'?'':`="${v}"`}]["name"](area.scope);`).join('')});out center tags ${scope.limit};`;
}
export async function geography(city: string, signal?: AbortSignal, progress?:Progress) {
 const local=await localBundle(city,signal,progress);
 if(local){const areas=local.areas.map(({id,name,kind,level})=>({id,name,kind,level}));await db.query("INSERT INTO geo_cache(city,relation_id,areas,transport) VALUES($1,$2,$3,'local_extract') ON CONFLICT(city) DO UPDATE SET relation_id=$2,areas=$3,transport='local_extract',verified_at=now()",[city,local.relationId,JSON.stringify(areas)]);return {relationId:local.relationId,areas,verifiedAt:local.createdAt,transport:'local_extract'};}
 const cached = await db.query("SELECT * FROM geo_cache WHERE city=$1 AND verified_at>now()-interval '30 days'",[city]);
 if(cached.rowCount&&cached.rows[0].transport==='overpass') return {relationId:Number(cached.rows[0].relation_id), areas:cached.rows[0].areas as Area[], verifiedAt:cached.rows[0].verified_at,transport:'overpass'};
 if(!cities.includes(city as typeof cities[number])) throw new Error('Choose a Metro Manila city.');
 const names = city==='Manila'?'Manila|City of Manila':city==='Quezon City'?'Quezon City|Quezon':city;
 const result = await overpass(`[out:json][timeout:30];rel["boundary"="administrative"]["admin_level"="6"]["name"~"^(${names})$"](14.34,120.90,14.82,121.16);out tags;`, 'city boundary',signal);
 if(result.elements.length!==1) throw new Error(`A unique OSM city boundary could not be verified for ${city}. No scan was started.`);
 const relationId=result.elements[0].id;
 const sub = await overpass(`[out:json][timeout:40];rel(${relationId});map_to_area->.city;rel["boundary"="administrative"]["admin_level"~"^(7|8|9|10)$"](area.city);out tags;`, 'subareas',signal);
 const areas:Area[]=sub.elements.filter(e=>e.tags?.name).map((e):Area=>({id:e.id,name:e.tags!.name,level:e.tags!.admin_level,kind:['7','8'].includes(e.tags!.admin_level)?'district':'barangay'})).sort((a,b)=>a.name.localeCompare(b.name));
 await db.query('INSERT INTO geo_cache(city,relation_id,areas) VALUES($1,$2,$3) ON CONFLICT(city) DO UPDATE SET relation_id=$2,areas=$3,verified_at=now()',[city,relationId,JSON.stringify(areas)]);
 return {relationId,areas,verifiedAt:new Date().toISOString(),transport:'overpass'};
}
export function initialWebsite(tags: Record<string,string>) {
 const website=tags.website||tags['contact:website']||'';
 const social=socialLinks(tags)[0]?.url||'';
 if(!website) return {website,social,status:social?'social_only':'not_listed',reason:social?'Only a social profile is listed in the OSM record. Check for a separate website.':'The OSM record has no website field. This does not establish that the business has no website.'};
 if(socialPlatform(website)) return {website,social:social||website,status:'social_only',reason:'The listed website is a social media profile. Check for an independent website.'};
 return {website,social,status:'review',reason:'A website is listed. Run a website check to assess its availability.'};
}
export async function storeElement(e: Element, scope: Scope, scanId: string) {
 const tags=e.tags||{}; if(!tags.name||!['node','way','relation'].includes(e.type))return false;
 const lat=e.lat??e.center?.lat??null,lon=e.lon??e.center?.lon??null;
 const assessment=initialWebsite(tags);
 const address=[tags['addr:housenumber'],tags['addr:street'],tags['addr:suburb'],tags['addr:postcode']].filter(Boolean).join(' ');
 const result=await db.query(`INSERT INTO businesses(osm_type,osm_id,name,category,city,address,district,barangay,lat,lon,location,website,phone,email,social,source_url,tags,website_status,website_reason)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $9::float IS NULL OR $10::float IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($10,$9),4326) END,$11,$12,$13,$14,$15,$16,$17,$18)
 ON CONFLICT(osm_type,osm_id) DO UPDATE SET name=$3,category=$4,city=$5,address=$6,district=$7,barangay=$8,lat=$9,lon=$10,location=EXCLUDED.location,website=$11,phone=$12,email=$13,social=$14,tags=$16,updated_at=now(),
 website_status=CASE WHEN businesses.website=$11 AND $11<>'' THEN businesses.website_status ELSE $17 END,website_reason=CASE WHEN businesses.website=$11 AND $11<>'' THEN businesses.website_reason ELSE $18 END,checked_at=CASE WHEN businesses.website=$11 AND $11<>'' THEN businesses.checked_at ELSE NULL END RETURNING id`,
 [e.type,e.id,tags.name,scope.category==='custom'?`${scope.customKey}=${scope.customValue}`:scope.category,scope.city,address,tags['addr:district']||tags['scanner:osm_district']||'',tags['addr:barangay']||tags['addr:suburb']||tags['scanner:osm_barangay']||'',lat,lon,assessment.website,tags.phone||tags['contact:phone']||'',tags.email||tags['contact:email']||'',assessment.social,`https://www.openstreetmap.org/${e.type}/${e.id}`,JSON.stringify(tags),assessment.status,assessment.reason]);
 await db.query('INSERT INTO scan_businesses(scan_id,business_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[scanId,result.rows[0].id]); return true;
}
