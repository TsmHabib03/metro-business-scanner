import http from 'node:http';
const origin=process.env.PUBLIC_ORIGIN;
const req=http.get({host:'127.0.0.1',port:Number(process.env.PORT||3001),path:'/api/health',headers:origin?{Host:new URL(origin).host,Authorization:`Basic ${Buffer.from(`${process.env.ACCESS_USERNAME}:${process.env.ACCESS_PASSWORD}`).toString('base64')}`}:{Host:'localhost'}},res=>{
 let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>{try{const data=JSON.parse(body);process.exit(res.statusCode===200&&data.ok&&data.database?0:1);}catch{process.exit(1);}});
});
req.setTimeout(4000,()=>{req.destroy();process.exit(1);});req.on('error',()=>process.exit(1));
