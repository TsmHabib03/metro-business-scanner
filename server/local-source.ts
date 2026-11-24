import { readFile,access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { cities, categories,type Scope,type Area } from '../shared/catalog.ts';
import { enforceLocalPolicy } from './policy.ts';
import { preparationQueue,type Progress } from './preparation.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const prepare=preparationQueue((city,progress)=>new Promise<void>((resolve,reject)=>{
 const child=spawn(process.env.PYTHON_COMMAND||'python',['-u',`${root}/scripts/extract-city.py`,city],{cwd:root,windowsHide:true});
 let output='',buffer='',timedOut=false;
 const timeout=setTimeout(()=>{timedOut=true;child.kill();},8*60*1000);
 child.stdout.on('data',chunk=>{
  buffer+=String(chunk);const lines=buffer.split(/\r?\n/);buffer=lines.pop()||'';
  for(const line of lines){try{const data=JSON.parse(line);if(typeof data.stage==='string')progress(data.stage);}catch{}}
 });
 child.stderr.on('data',chunk=>{output=(output+String(chunk)).slice(-1000);});
 child.on('error',error=>{clearTimeout(timeout);reject(error);});
 child.on('close',code=>{clearTimeout(timeout);if(timedOut)reject(new Error('Local data preparation exceeded 8 minutes. Retry the scan; cached preparation is retained.'));else if(code===0)resolve();else reject(new Error(`Local city extraction failed: ${output||`process exited ${code}`}`));});
}));
export interface LocalBundle { city:string;relationId:number;areas:(Area & {geometry:unknown})[];geometry:unknown;elements:{type:string;id:number;lat:number;lon:number;tags:Record<string,string>;areaIds:number[]}[];source:{url:string;sha256:string;downloadedAt:string;dataTimestamp:string;license:string};createdAt:string }
export async function hasExtract() {try{await access(`${root}/.local-data/extract-manifest.json`);await access(`${root}/.local-data/philippines.osm.pbf`);return true;}catch{return false;}}
export async function localBundle(city:string,signal?:AbortSignal,progress?:Progress):Promise<LocalBundle|null> {
 if(!cities.includes(city as typeof cities[number]))throw new Error('Unsupported city.');
 if(!await hasExtract())return null;
 enforceLocalPolicy();
 const path=`${root}/.local-data/${city}.json`;
 const manifest=JSON.parse(await readFile(`${root}/.local-data/extract-manifest.json`,'utf8'));
 if(manifest.license!=='ODbL-1.0'||!/^[a-f0-9]{64}$/.test(manifest.sha256)||!Number.isFinite(Date.parse(manifest.dataTimestamp)))throw new Error('Invalid local source manifest. Run the verified extract setup.');
 try{const bundle=JSON.parse(await readFile(path,'utf8'));if(bundle.source.sha256===manifest.sha256)return bundle;}catch{}
 // Cancellation stops this caller's wait. Shared reusable preparation finishes
 // for other geography/scan callers, with a finite subprocess deadline.
 await prepare(city,signal,progress);
 return JSON.parse(await readFile(path,'utf8'));
}
export function localMatches(bundle:LocalBundle,scope:Scope) {
 const filters:readonly (readonly string[])[]=scope.category==='custom'?[[scope.customKey!,scope.customValue!]]:categories.find(c=>c.id===scope.category)!.tags;
 if(scope.areaId&&!bundle.areas.some(a=>a.id===scope.areaId))throw new Error('The selected area is not in this city extract.');
 return bundle.elements.filter(e=>(!scope.areaId||e.areaIds.includes(scope.areaId))&&filters.some(([k,v])=>v==='*'?!!e.tags[k]:e.tags[k]===v)).slice(0,scope.limit).map(e=>({...e,tags:{...e.tags,'scanner:transport':'Geofabrik local OSM extract','scanner:extract_sha256':bundle.source.sha256,'scanner:data_timestamp':bundle.source.dataTimestamp}}));
}
