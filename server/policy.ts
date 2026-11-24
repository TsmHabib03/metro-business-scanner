export const policy = {
 source: 'OpenStreetMap', operator: 'Private.coffee', endpoint: 'https://overpass.private.coffee/api/interpreter',
 permissionUrl: 'https://overpass.private.coffee/', licenseUrl: 'https://www.openstreetmap.org/copyright',
 verifiedAt: '2026-11-24', termsDate: '2026-04-10', evidenceHash: '0be79668423e1bc2fdb56a30114759c2f3540024f325b446dca79fe11e470e90',
 attribution: '© OpenStreetMap contributors · ODbL 1.0', maxResults: 200, dailyRequests: 40, intervalSeconds: 10,
 privacy: 'Area and category queries are sent to Private.coffee. The operator may retain truncated IP addresses and request metadata for up to 48 hours. Notes and prospect statuses stay in your local database.',
};
export const localPolicy={...policy,operator:'Geofabrik local extract',endpoint:'https://download.geofabrik.de/asia/philippines-latest.osm.pbf',permissionUrl:'https://www.geofabrik.de/data/download.html',verifiedAt:'2026-11-24',termsDate:'2026-11-24',evidenceHash:'9ec19dc79a43c96a603ae546e1c78e72ec8811eeb797f2098451f59e461a8dec',dailyRequests:0,privacy:'Discovery runs against an OSM extract on this computer. City and category queries, notes and prospect statuses stay local. Downloading or refreshing the extract contacts Geofabrik.'};
export function enforceLocalPolicy(verifiedAt=localPolicy.verifiedAt){const age=Date.now()-Date.parse(verifiedAt);if(age < -86400000||age>90*86400000)throw new Error('Local source permission review has expired. Recheck Geofabrik terms before scanning.');}
export function enforcePolicy(endpoint = policy.endpoint, verifiedAt = policy.verifiedAt) {
 if (endpoint !== policy.endpoint) throw new Error('This endpoint has no verified permission policy. Configure and review its terms before enabling it.');
 const age = Date.now() - Date.parse(verifiedAt);
 if (age < -86400000 || age > 90 * 86400000) throw new Error('Source permission review has expired. Recheck the operator terms before scanning.');
}
