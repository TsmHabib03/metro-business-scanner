export type Progress = (stage:string)=>void;
/** Share same-city preparation and serialize different cities' disk-heavy work. */
export function preparationQueue(run:(city:string,progress:Progress)=>Promise<void>) {
 const jobs=new Map<string,{promise:Promise<void>;listeners:Set<Progress>;stage:string}>();
 let tail:Promise<void>=Promise.resolve();
 return async(city:string,signal?:AbortSignal,progress?:Progress)=>{
  signal?.throwIfAborted();
  let job=jobs.get(city);
  if(!job){
   job={promise:Promise.resolve(),listeners:new Set(),stage:'Waiting for local data preparation'};
   const current=job;
   current.promise=tail.then(()=>run(city,stage=>{current.stage=stage;for(const listener of current.listeners)listener(stage);}));
   tail=current.promise.catch(()=>{});
   jobs.set(city,current);
   const clear=()=>{if(jobs.get(city)===current)jobs.delete(city);};
   current.promise.then(clear,clear);
  }
  const current=job;
  if(progress){current.listeners.add(progress);progress(current.stage);}
  try{
   if(!signal){await current.promise;return;}
   await new Promise<void>((resolve,reject)=>{
    const abort=()=>{cleanup();reject(signal.reason);};
    const cleanup=()=>signal.removeEventListener('abort',abort);
    signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted)abort();
    current.promise.then(()=>{cleanup();resolve();},error=>{cleanup();reject(error);});
   });
  }finally{if(progress)current.listeners.delete(progress);}
 };
}
