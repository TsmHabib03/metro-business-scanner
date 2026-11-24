import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { Agent, request } from 'undici';
export function publicAddress(address:string) {
 try {const addr=ipaddr.process(address);return addr.range()==='unicast';}catch{return false;}
}
export function normalizedUrl(raw:string) {
 const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!['','80','443'].includes(url.port))throw new Error('Only public HTTP or HTTPS websites on standard ports can be checked.');
 if(url.hostname==='localhost'||url.hostname.endsWith('.localhost')||url.hostname.endsWith('.local'))throw new Error('Local websites cannot be checked.');
 return url;
}
export async function checkWebsite(raw:string) {
 let url:URL;try{url=normalizedUrl(raw);}catch(e){return {status:'review',reason:(e as Error).message};}
 const timeout=AbortSignal.timeout(12000);
 try {
  for(let hop=0;hop<4;hop++) {
   const host=url.hostname.replace(/^\[|\]$/g,'');
   const addresses=await new Promise<{address:string;family:number}[]>((resolve,reject)=>{const abort=()=>reject(new Error('Website DNS resolution timed out.'));timeout.addEventListener('abort',abort,{once:true});dns.lookup(host,{all:true}).then(resolve,reject).finally(()=>timeout.removeEventListener('abort',abort));});
   if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))return {status:'review',reason:'Website check blocked because the hostname resolves to a private or reserved address.'};
   // Pin the vetted DNS answer so a second lookup cannot rebind to a private host.
   const vetted=addresses[0];
   const agent=new Agent({connect:{lookup:((_hostname: string,_options:unknown,callback:Function)=>callback(null,vetted.address,vetted.family)) as never}});
   try {
    const response=await request(url,{method:'GET',dispatcher:agent,signal:timeout,headersTimeout:10000,bodyTimeout:5000,headers:{'user-agent':'MetroManilaBusinessScanner/0.1 WebsiteAvailabilityCheck','range':'bytes=0-65535','accept':'text/html,application/xhtml+xml'}});
    const status=response.statusCode;const location=response.headers.location;
    response.body.destroy();
    if([301,302,303,307,308].includes(status)&&location){url=normalizedUrl(new URL(String(location),url).href);continue;}
    if(status>=200&&status<300)return {status:'existing',reason:`Website responded with HTTP ${status} on ${new Date().toISOString()}. Availability alone does not establish website quality.`};
    if(status===403||status===429)return {status:'review',reason:`Website returned HTTP ${status}; access restrictions prevent a reliable availability assessment.`};
    return {status:'unavailable',reason:`Website returned HTTP ${status}. This is a temporary observation, not proof that the business has no website.`};
   }finally{await agent.destroy();}
  }
  return {status:'review',reason:'Too many redirects. Review the website manually.'};
 }catch(e){return {status:'unavailable',reason:`Website request failed (${(e as Error).message.slice(0,180)}). Verify manually before treating it as an opportunity.`};}
}
