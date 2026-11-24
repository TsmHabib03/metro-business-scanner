import {test} from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {installAccess} from '../server/access.ts';
test('private hosting denies anonymous access, untrusted hosts and cross-origin writes',async()=>{
 process.env.PUBLIC_ORIGIN='https://scanner.example.com';process.env.ACCESS_USERNAME='owner';process.env.ACCESS_PASSWORD='test-only-long-password-12345';
 const app=Fastify();installAccess(app,3001);app.get('/api/records',async()=>({ok:true}));app.post('/api/scan',async()=>({ok:true}));
 const authorization='Basic '+Buffer.from(`owner:${process.env.ACCESS_PASSWORD}`).toString('base64');
 try{
  assert.equal((await app.inject({url:'/api/records',headers:{host:'scanner.example.com'}})).statusCode,401);
  assert.equal((await app.inject({url:'/api/records',headers:{host:'evil.example',authorization}})).statusCode,403);
  assert.equal((await app.inject({url:'/api/records',headers:{host:'scanner.example.com',authorization}})).statusCode,200);
  assert.equal((await app.inject({url:'/api/scan',method:'POST',headers:{host:'scanner.example.com',authorization,origin:'https://evil.example'}})).statusCode,403);
  assert.equal((await app.inject({url:'/api/scan',method:'POST',headers:{host:'scanner.example.com',authorization}})).statusCode,403);
  assert.equal((await app.inject({url:'/api/scan',method:'POST',headers:{host:'scanner.example.com',authorization,origin:process.env.PUBLIC_ORIGIN}})).statusCode,200);
 }finally{await app.close();delete process.env.PUBLIC_ORIGIN;delete process.env.ACCESS_USERNAME;delete process.env.ACCESS_PASSWORD;}
});
