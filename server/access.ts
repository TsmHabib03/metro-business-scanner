import {timingSafeEqual} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
export function installAccess(app:FastifyInstance,port:number){
 const origin=process.env.PUBLIC_ORIGIN;
 const username=process.env.ACCESS_USERNAME,password=process.env.ACCESS_PASSWORD;
 if(origin){const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw new Error('PUBLIC_ORIGIN must be an exact HTTPS origin.');if(!username||!password||password.length<20||username.includes(':'))throw new Error('Hosted access needs ACCESS_USERNAME and an ACCESS_PASSWORD of at least 20 characters.');}
 const attempts=new Map<string,{count:number;until:number}>();
 const matches=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
 app.addHook('onRequest',async(req,reply)=>{
  if(!origin){if(!['127.0.0.1','localhost','[::1]'].includes((req.headers.host||'').replace(/:\d+$/,'')))return reply.code(403).send({error:'Local access only.'});
   if(req.headers.origin&&!['http://127.0.0.1:5173','http://localhost:5173',`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin))return reply.code(403).send({error:'Untrusted request origin.'});return;}
  if(req.headers.host!==new URL(origin).host)return reply.code(403).send({error:'Untrusted request host.'});
  if(req.headers.origin&&req.headers.origin!==origin)return reply.code(403).send({error:'Untrusted request origin.'});
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==origin)return reply.code(403).send({error:'A same-origin request is required.'});
  if(req.headers['sec-fetch-site']==='cross-site')return reply.code(403).send({error:'Cross-site requests are denied.'});
  const key=req.ip,now=Date.now();const attempt=attempts.get(key);if(attempt&&attempt.until>now&&attempt.count>=20)return reply.code(429).send({error:'Too many failed logins. Retry in 10 minutes.'});
  const header=req.headers.authorization||'';const supplied=/^Basic [A-Za-z0-9+/]+=*$/.test(header)?Buffer.from(header.slice(6),'base64').toString():'';
  if(!matches(supplied,`${username}:${password}`)){if(attempts.size>10000)for(const [ip,a]of attempts)if(a.until<now)attempts.delete(ip);attempts.set(key,{count:attempt&&attempt.until>now?attempt.count+1:1,until:attempt&&attempt.until>now?attempt.until:now+600000});return reply.header('WWW-Authenticate','Basic realm="Metro private workspace", charset="UTF-8"').header('Cache-Control','no-store').code(401).send({error:'Private workspace login required.'});}
  attempts.delete(key);reply.header('Cache-Control','no-store');
 });
 app.addHook('onSend',async(_req,reply)=>{reply.header('X-Content-Type-Options','nosniff').header('Referrer-Policy','no-referrer').header('X-Frame-Options','DENY');});
}
