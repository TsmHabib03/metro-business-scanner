import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localMatches,type LocalBundle } from '../server/local-source.ts';
import { enforceLocalPolicy } from '../server/policy.ts';
test('local discovery applies subarea, category and result limit with source evidence',()=>{
 const bundle={city:'Makati',relationId:1,geometry:{},createdAt:'2026-11-24T00:00:00Z',areas:[{id:101,name:'Test area',kind:'barangay',level:'10',geometry:{}}],source:{url:'https://download.geofabrik.de/asia/philippines-latest.osm.pbf',sha256:'a'.repeat(64),dataTimestamp:'2026-11-23T00:00:00Z',downloadedAt:'2026-11-24T00:00:00Z',license:'ODbL-1.0'},elements:[
 {id:1,type:'node',lat:14.5,lon:121,tags:{name:'Fixture A',healthcare:'dentist'},areaIds:[101]},
 {id:2,type:'node',lat:14.5,lon:121,tags:{name:'Fixture B',amenity:'dentist'},areaIds:[]},
 {id:3,type:'node',lat:14.5,lon:121,tags:{name:'Fixture C',shop:'bakery'},areaIds:[101]},
 ]} as LocalBundle;
 const rows=localMatches(bundle,{city:'Makati',category:'dental',areaId:101,limit:25});
 assert.deepEqual(rows.map(r=>r.id),[1]);assert.equal(rows[0].tags['scanner:extract_sha256'],'a'.repeat(64));
 assert.equal(localMatches(bundle,{city:'Makati',category:'dental',limit:1}).length,1);
 assert.deepEqual(localMatches(bundle,{city:'Makati',category:'custom',customKey:'shop',customValue:'bakery',limit:25}).map(r=>r.id),[3]);
 assert.throws(()=>localMatches(bundle,{city:'Makati',category:'dental',areaId:999,limit:25}));
});
test('local discovery also requires a current permission review',()=>{assert.throws(()=>enforceLocalPolicy('2020-01-01'));});
