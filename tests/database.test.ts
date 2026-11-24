import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../server/db.ts';
import { storeElement } from '../server/discovery.ts';
test('OSM refresh deduplicates records and preserves prospect notes',async(t)=>{
 const scope={city:'Makati',category:'dental',limit:25} as const;
 const scan=(await db.query('INSERT INTO scans(scope,state) VALUES($1,$2) RETURNING id',[JSON.stringify(scope),'cancelled'])).rows[0].id;
 const osmId=8999999999999;
 try {
  await storeElement({type:'node',id:osmId,lat:14.55,lon:121.02,tags:{name:'TEST FIXTURE — not a real business',website:'https://example.com'}},scope,scan);
  const original=(await db.query('SELECT * FROM businesses WHERE osm_id=$1',[osmId])).rows[0];
  await db.query("INSERT INTO prospects(business_id,status,notes) VALUES($1,'saved','Preserve these user notes')",[original.id]);
  await db.query("UPDATE businesses SET website_status='existing',checked_at=now() WHERE id=$1",[original.id]);
  await storeElement({type:'node',id:osmId,lat:14.56,lon:121.03,tags:{name:'TEST FIXTURE refreshed',website:'https://example.com'}},scope,scan);
  const refreshed=(await db.query('SELECT b.*,p.notes FROM businesses b JOIN prospects p ON p.business_id=b.id WHERE b.osm_id=$1',[osmId])).rows;
  assert.equal(refreshed.length,1);assert.equal(refreshed[0].id,original.id);assert.equal(refreshed[0].notes,'Preserve these user notes');assert.equal(refreshed[0].website_status,'existing');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM scan_businesses WHERE scan_id=$1',[scan])).rows[0].n,1);
  // New social evidence must update an empty-website record without losing the prospect.
  await storeElement({type:'node',id:osmId,tags:{name:'TEST FIXTURE no website'}},scope,scan);
  await storeElement({type:'node',id:osmId,tags:{name:'TEST FIXTURE with socials','contact:facebook':'fixture','contact:instagram':'fixture'}},scope,scan);
  const social=(await db.query('SELECT b.website_status,b.tags,p.notes FROM businesses b JOIN prospects p ON p.business_id=b.id WHERE b.osm_id=$1',[osmId])).rows[0];
  assert.equal(social.website_status,'social_only');assert.equal(social.tags['contact:instagram'],'fixture');assert.equal(social.notes,'Preserve these user notes');
 }finally{await db.query('DELETE FROM businesses WHERE osm_id=$1',[osmId]);await db.query('DELETE FROM scans WHERE id=$1',[scan]);await db.end();}
});
