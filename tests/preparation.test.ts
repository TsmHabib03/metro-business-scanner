import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preparationQueue } from '../server/preparation.ts';

function deferred(){let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};}
test('same-city callers share preparation; cancellation does not cancel other callers; cities serialize',async()=>{
 const first=deferred(),second=deferred();const started:string[]=[];const stages:string[]=[];
 const prepare=preparationQueue(async(city,progress)=>{started.push(city);progress('Indexing '+city);await(city==='Makati'?first.promise:second.promise);});
 const controller=new AbortController();
 const cancelled=prepare('Makati',controller.signal,stage=>stages.push(stage));
 const shared=prepare('Makati');const queued=prepare('Quezon City');
 await Promise.resolve();assert.deepEqual(started,['Makati']);assert.ok(stages.includes('Indexing Makati'));
 controller.abort();await assert.rejects(cancelled,{name:'AbortError'});
 first.resolve();await shared;await Promise.resolve();assert.deepEqual(started,['Makati','Quezon City']);
 second.resolve();await queued;
 const alreadyAborted=new AbortController();alreadyAborted.abort();await assert.rejects(prepare('Pasig',alreadyAborted.signal));assert.equal(started.includes('Pasig'),false);
});
test('failed preparation is evicted and can retry without blocking the next city',async()=>{
 let attempts=0;const prepare=preparationQueue(async()=>{if(++attempts===1)throw new Error('Disk read failed');});
 await assert.rejects(prepare('Makati'),/Disk read failed/);await prepare('Makati');assert.equal(attempts,2);
});
test('cancellation during initial progress cannot miss the abort event',async()=>{
 const gate=deferred();const controller=new AbortController();
 const prepare=preparationQueue(async()=>{await gate.promise;});
 const result=prepare('Makati',controller.signal,()=>controller.abort());
 await assert.rejects(result,{name:'AbortError'});gate.resolve();
});
