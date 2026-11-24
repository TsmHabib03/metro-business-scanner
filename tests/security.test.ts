import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileQuery, initialWebsite, scopeSchema } from '../server/discovery.ts';
import { publicAddress,normalizedUrl } from '../server/website.ts';
import { enforcePolicy } from '../server/policy.ts';
import { safeCell,csv,xlsx } from '../server/export.ts';
import ExcelJS from 'exceljs';
test('query compiler bounds collection to a verified area and an allowed category',()=>{
 const q=compileQuery({city:'Makati',category:'dental',limit:25},1234);
 assert.match(q,/rel\(1234\)/);assert.match(q,/out center tags 25;/);assert.match(q,/\["amenity"="dentist"\]/);
 assert.throws(()=>compileQuery({city:'Makati',category:'custom',customKey:'shop',customValue:'bakery"];out;(',limit:25},1234));
 assert.throws(()=>scopeSchema.parse({city:'Makati',category:'dental',limit:5000}));
 assert.throws(()=>compileQuery({city:'Makati',category:'dental',limit:25},NaN));
});
test('source policy denies unreviewed endpoints and stale verification',()=>{
 assert.throws(()=>enforcePolicy('https://example.com/api'));
 assert.throws(()=>enforcePolicy(undefined,'2020-01-01'));
});
test('missing website and social-only evidence preserve uncertainty',()=>{
 const missing=initialWebsite({name:'A business'});assert.equal(missing.status,'not_listed');assert.match(missing.reason,/does not establish/);
 assert.equal(initialWebsite({'contact:facebook':'https://facebook.com/business'}).status,'social_only');
 assert.equal(initialWebsite({website:'https://www.facebook.com/business'}).status,'social_only');
 assert.equal(initialWebsite({website:'https://business.example'}).status,'review');
});
test('website checks reject local, reserved and mapped-private IP addresses',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.1','169.254.169.254','0.0.0.0','::1','fc00::1','::ffff:127.0.0.1','2001:db8::1','224.0.0.1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('1.1.1.1'),true);
 for(const url of ['http://localhost','http://foo.local','http://u:p@example.com','http://example.com:8080'])assert.throws(()=>normalizedUrl(url));
 assert.equal(normalizedUrl('example.com').href,'https://example.com/');
});
test('exports neutralize spreadsheet formulas and include an ODbL sheet',async()=>{
 assert.equal(safeCell(' =HYPERLINK("x")'),'\' =HYPERLINK("x")');
 const rows=[{name:'=1+1',tags:{name:'=1+1'}}] as never;
 assert.match(csv(rows),/"'=1\+1"/);
 const bytes=await xlsx(rows);const book=new ExcelJS.Workbook();await book.xlsx.load(bytes as never);
 assert.equal(book.getWorksheet('OSM businesses')!.getCell('A2').value,"'=1+1");
 assert.match(String(book.getWorksheet('License & attribution')!.getCell('A2').value),/OpenStreetMap/);
});
