import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import http from 'node:http';
import {writeFile,rm,mkdir} from 'node:fs/promises';
const prefix='metro-upgrade-validation',network=prefix+'-net',db=prefix+'-db',app=prefix+'-app';
const dbSecret=randomBytes(32).toString('hex'),accessSecret=randomBytes(32).toString('hex');
const envPath='.impeccable/review/deployment.env';await mkdir('.impeccable/review',{recursive:true});
const run=(args,options={})=>{const r=spawnSync('docker',args,{encoding:'utf8',...options});if(r.status!==0)throw new Error(`Docker ${args[0]} failed: ${r.stderr.slice(-1000)}`);return r.stdout;};
const headers={Host:'scanner.validation.invalid',Authorization:'Basic '+Buffer.from('owner:'+accessSecret).toString('base64')};
// Node's fetch normalizes Host; raw HTTP lets this isolated test exercise the production origin.
const request=(path,options={})=>new Promise((resolve,reject)=>{const req=http.request('http://127.0.0.1:3301/api'+path,options,res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,text}));});req.setTimeout(4000,()=>req.destroy(new Error('Request timed out')));req.on('error',reject);req.end(options.body);});
const api=async(path,body,method=body?'POST':'GET')=>{const r=await request(path,{method,headers:{...headers,...(body?{Origin:'https://scanner.validation.invalid','Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});assert.equal(r.status,200+(path==='/scans'&&method==='POST'?2:0),r.text);return JSON.parse(r.text);};
const ready=async()=>{let last;for(let i=0;i<60;i++){try{await api('/health');return;}catch(e){last=e;}await new Promise(r=>setTimeout(r,500));}throw new Error('Application did not become healthy: '+last?.message);};
const checks=[];
try{
 await writeFile(envPath,`POSTGRES_DB=metro_scanner\nPOSTGRES_USER=scanner\nPOSTGRES_PASSWORD=${dbSecret}\nDATABASE_URL=postgresql://scanner:${dbSecret}@${db}:5432/metro_scanner\nPUBLIC_ORIGIN=https://scanner.validation.invalid\nACCESS_USERNAME=owner\nACCESS_PASSWORD=${accessSecret}\n`);
 // Validate production interpolation without displaying secrets or provisioning a public proxy.
 run(['compose','--env-file',envPath,'-f','compose.production.yaml','config','--quiet'],{env:{...process.env,DOMAIN:'scanner.validation.invalid',DB_PASSWORD:dbSecret}});
 run(['network','create',network]);
 run(['run','-d','--name',db,'--network',network,'--env-file',envPath,'postgis/postgis:16-3.4']);
 let databaseReady=false;for(let i=0;i<60;i++){const r=spawnSync('docker',['exec',db,'pg_isready','-h','127.0.0.1','-U','scanner','-d','metro_scanner'],{encoding:'utf8'});if(r.status===0){databaseReady=true;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(databaseReady,'PostgreSQL TCP listener did not become ready.');
 run(['run','-d','--name',app,'--network',network,'--env-file',envPath,'-p','127.0.0.1:3301:3001','--mount',`type=bind,source=${process.cwd()}\\.local-data,target=/app/.local-data,readonly`,'metro-scanner:validation']);
 await ready();run(['exec',app,'node','scripts/healthcheck.mjs']);checks.push('production Compose configuration','authenticated container healthcheck');
 assert.equal((await request('/businesses',{headers:{Host:headers.Host}})).status,401);
 assert.equal((await request('/scans',{method:'POST',headers:{...headers,Origin:'https://other.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
 checks.push('anonymous access denied','cross-origin writes denied');
 const started=Date.now(),scan=await api('/scans',{city:'Makati',category:'dental',limit:25});let finished;
 for(let i=0;i<30;i++){finished=(await api('/scans')).find(s=>s.id===scan.id);if(['completed','failed','cancelled'].includes(finished.state))break;await new Promise(r=>setTimeout(r,200));}
 assert.equal(finished.state,'completed',JSON.stringify(finished));assert.ok(finished.stored>0&&finished.stored<=25);const scanMs=Date.now()-started;
 const records=await api('/businesses?city=Makati');const first=records.rows[0];await api('/businesses/'+first.id,{status:'saved',notes:'Isolated deployment persistence fixture'},'PATCH');
 const map=await api('/map-features?city=Makati');assert.equal(map.total,records.total);assert.equal(map.features.length,records.total);assert.equal(map.complete,true);
 run(['restart',app]);await ready();assert.equal((await api('/businesses/'+first.id)).notes,'Isolated deployment persistence fixture');checks.push('bounded local Makati scan','map/list parity','records and notes survive app restart');
 // Dump/restore into a separate database in the isolated container. No live workspace DB involved.
 run(['exec',db,'pg_dump','-U','scanner','-d','metro_scanner','-Fc','-f','/tmp/metro.dump']);
 run(['exec',db,'createdb','-U','scanner','metro_restore']);run(['exec',db,'pg_restore','-U','scanner','-d','metro_restore','--no-owner','/tmp/metro.dump']);
 const restored=run(['exec',db,'psql','-U','scanner','-d','metro_restore','-Atc',"SELECT count(*) FROM prospects WHERE notes='Isolated deployment persistence fixture'"]);assert.equal(restored.trim(),'1');checks.push('PostgreSQL backup restores records and notes');
 const report={checkedAt:new Date().toISOString(),image:'metro-scanner:validation',stored:finished.stored,scanMs,checks,liveDeployment:false};await writeFile('docs/validation/deployment-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){
 const redact=s=>s.replaceAll(dbSecret,'[database secret]').replaceAll(accessSecret,'[access secret]');
 for(const name of [app,db]){const logs=spawnSync('docker',['logs','--tail','35',name],{encoding:'utf8'});console.error(redact(name+' diagnostics: '+logs.stdout+logs.stderr));}
 throw error;
}finally{
 for(const name of [app,db])spawnSync('docker',['rm','-f',name],{encoding:'utf8'});
 spawnSync('docker',['network','rm',network],{encoding:'utf8'});await rm(envPath,{force:true});
}
