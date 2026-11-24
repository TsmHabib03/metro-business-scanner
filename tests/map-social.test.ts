import {test} from 'node:test';
import assert from 'node:assert/strict';
import {socialLinks,socialPlatform,safeExternal} from '../shared/social.ts';
import {businessFilters} from '../server/business-query.ts';
import {initialWebsite} from '../server/discovery.ts';
test('social profiles preserve platform provenance, deduplicate and reject misleading domains',()=>{
 const links=socialLinks({'contact:facebook':'https://www.facebook.com/empiredentalPH?utm_source=osm','contact:instagram':'empiredentalph',facebook:'http://facebook.com/empiredentalPH'});
 assert.equal(links.length,2);assert.equal(links[0].source_field,'contact:facebook');assert.equal(links[1].url,'https://www.instagram.com/empiredentalph');
 for(const value of ['https://facebook.com.evil/business','facebook.com.evil','https://evil.com/facebook.com','javascript:alert(1)','https://user:pass@facebook.com/business','https://facebook.com:444/business'])assert.equal(socialLinks({facebook:value}).length,0,value);
 assert.equal(socialPlatform('https://notfacebook.com/business'),undefined);assert.equal(safeExternal('javascript:alert(1)'),undefined);
 assert.equal(socialLinks({'contact:whatsapp':'+63 917 123 4567'})[0].url,'https://wa.me/639171234567');
 assert.equal(initialWebsite({website:'https://clinic.example','contact:facebook':'clinic'}).status,'review');
});
test('map filters use parameters and validate geographic bounds',()=>{
 const f=businessFilters({city:'Makati',search:"O'Reilly",bbox:'120.9,14.5,121.1,14.7',website:'social_only'});
 assert.match(f.where,/ST_MakeEnvelope\(\$4,\$5,\$6,\$7,4326\)/);assert.ok(!f.where.includes("O'Reilly"));assert.equal(f.values.length,7);
 for(const bbox of ['1,2,3','-181,0,1,1','1,2,0,3','0,0,1,NaN','0,0,1,91'])assert.throws(()=>businessFilters({bbox}));
 assert.throws(()=>businessFilters({website:'invented'}));
});
