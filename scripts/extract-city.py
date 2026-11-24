"""Create one city-scoped OSM bundle from the permitted Geofabrik extract.
Run: python scripts/extract-city.py Makati
Only named businesses inside the assembled OSM city polygon are retained.
"""
import sys, pathlib, json, datetime, os
sys.stdout.reconfigure(encoding='utf8')
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.local-tools'))
import osmium
from shapely import wkb
from shapely.geometry import mapping, shape
from local_spatial import select_businesses
CITY_NAMES = ['Caloocan','Las Piñas','Makati','Malabon','Mandaluyong','Manila','Marikina','Muntinlupa','Navotas','Parañaque','Pasay','Pasig','Quezon City','San Juan','Taguig','Valenzuela','Pateros']
city = sys.argv[1]
if city not in CITY_NAMES: raise SystemExit('Unsupported city')
target = ROOT / '.local-data' / (city + '.json')
source = ROOT / '.local-data' / 'philippines.osm.pbf'
manifest = json.loads((ROOT / '.local-data' / 'extract-manifest.json').read_text())
factory = osmium.geom.WKBFactory()
def progress(stage):
    print(json.dumps({'stage': stage}), flush=True)

def write_json(path, payload):
    # Unique temp names also make direct CLI and API preparation safe together.
    temp = path.with_name(path.name + '.' + str(os.getpid()) + '.tmp')
    temp.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf8')
    temp.replace(path)
class Boundaries(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.relations = {}; self.polygons = {}
    def relation(self, r):
        tags = dict(r.tags)
        if tags.get('boundary') == 'administrative' and tags.get('admin_level') in ['6','7','8','9','10'] and tags.get('name'):
            self.relations[r.id] = tags
    def area(self, a):
        tags=dict(a.tags)
        if a.from_way() or tags.get('boundary')!='administrative' or tags.get('admin_level') not in ['6','7','8','9','10'] or not tags.get('name'): return
        self.relations[a.orig_id()]=tags
        try:
            poly = wkb.loads(factory.create_multipolygon(a), hex=True)
            # Keep only polygons intersecting the metropolitan bounding window.
            if poly.bounds[0] < 121.2 and poly.bounds[2] > 120.8 and poly.bounds[1] < 14.85 and poly.bounds[3] > 14.3:
                self.polygons[a.orig_id()] = poly
        except (RuntimeError, ValueError): pass
b = Boundaries()
boundary_cache=ROOT/'.local-data'/'metro-boundaries.json'
if boundary_cache.exists():
    cache=json.loads(boundary_cache.read_text(encoding='utf8'))
    if cache.get('sha256')==manifest['sha256']:
        b.relations={int(i):t for i,t in cache['relations'].items()};b.polygons={int(i):shape(p) for i,p in cache['polygons'].items()}
if not b.polygons:
    progress('Preparing local data: assembling OSM boundaries (one-time)')
    processor=osmium.FileProcessor(str(source)).with_locations('flex_mem').with_areas(osmium.filter.TagFilter(('boundary','administrative'))).with_filter(osmium.filter.EntityFilter(osmium.osm.AREA)).with_filter(osmium.filter.TagFilter(('boundary','administrative')))
    for entity in processor: b.area(entity)
    cache={'sha256':manifest['sha256'],'relations':{i:b.relations[i] for i in b.polygons},'polygons':{i:mapping(p) for i,p in b.polygons.items()}}
    write_json(boundary_cache, cache)
matches = [i for i,t in b.relations.items() if t.get('admin_level')=='6' and t.get('name') in [city, 'City of '+city] and i in b.polygons]
if len(matches) != 1: raise SystemExit('A unique OSM city polygon could not be assembled for '+city)
# Derive the reusable window from all supported city polygons, including
# Manila's western island boundary, rather than trimming to a guessed box.
metro_polygons = [b.polygons[i] for i,t in b.relations.items() if t.get('admin_level') == '6' and t.get('name') in CITY_NAMES + ['City of '+name for name in CITY_NAMES] and i in b.polygons]
metro_bounds = [min(p.bounds[0] for p in metro_polygons), min(p.bounds[1] for p in metro_polygons), max(p.bounds[2] for p in metro_polygons), max(p.bounds[3] for p in metro_polygons)]
relation_id = matches[0]; polygon = b.polygons[relation_id]
areas = []
for rid, poly in b.polygons.items():
    tags=b.relations[rid]
    if rid != relation_id and tags.get('admin_level') != '6' and polygon.covers(poly.representative_point()):
        areas.append({'id':rid,'name':tags['name'],'level':tags['admin_level'],'kind':'district' if tags['admin_level'] in ['7','8'] else 'barangay','geometry':mapping(poly)})
elements=[]
class Businesses(osmium.SimpleHandler):
    def capture(self, entity, kind, lat, lon, original_id=None):
        # Cache reusable Metro Manila candidates once. City/subarea assignment
        # happens below using a vectorized polygon check and a spatial index.
        if not (metro_bounds[0] <= lon <= metro_bounds[2] and metro_bounds[1] <= lat <= metro_bounds[3]): return
        tags=dict(entity.tags)
        if not tags.get('name') or not any(k in tags for k in ['amenity','shop','healthcare','leisure','office','craft']): return
        if kind!='node': tags['scanner:position']='Approximate representative position of OSM geometry'
        elements.append({'type':kind,'id':original_id or entity.id,'lat':lat,'lon':lon,'tags':tags})
    def node(self,n):
        if n.location.valid(): self.capture(n,'node',n.location.lat,n.location.lon)
    def way(self,w):
        if not w.tags.get('name'): return
        points=[(n.lon,n.lat) for n in w.nodes if n.location.valid()]
        if points: self.capture(w,'way',sum(p[1] for p in points)/len(points),sum(p[0] for p in points)/len(points))
    def area(self,a):
        if a.from_way() or not a.tags.get('name'): return
        try:
            p=wkb.loads(factory.create_multipolygon(a),hex=True).representative_point()
            self.capture(a,'relation',p.y,p.x,a.orig_id())
        except (RuntimeError,ValueError,IndexError): pass
candidate_cache=ROOT/'.local-data'/'metro-businesses.json'
if candidate_cache.exists():
    cache=json.loads(candidate_cache.read_text(encoding='utf8'))
    if cache.get('sha256')==manifest['sha256'] and cache.get('schemaVersion')==2 and cache.get('bounds')==metro_bounds:
        elements=cache['elements']
if not elements:
    progress('Preparing local data: indexing installed OSM extract (one-time)')
    h=Businesses()
    business_keys=osmium.filter.KeyFilter('amenity','shop','healthcare','leisure','office','craft')
    processor=osmium.FileProcessor(str(source)).with_locations('flex_mem').with_areas(business_keys,osmium.filter.KeyFilter('name')).with_filter(business_keys).with_filter(osmium.filter.KeyFilter('name'))
    for entity in processor:
        if entity.is_node(): h.node(entity)
        elif entity.is_way(): h.way(entity)
        elif entity.is_area(): h.area(entity)
    write_json(candidate_cache, {'schemaVersion':2,'bounds':metro_bounds,'sha256':manifest['sha256'],'elements':elements})
progress('Preparing local data: matching city and barangay boundaries')
elements=select_businesses(elements, polygon, areas)
payload={'city':city,'relationId':relation_id,'geometry':mapping(polygon),'areas':sorted(areas,key=lambda a:a['name']),'elements':elements,'source':manifest,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
write_json(target, payload)
print(json.dumps({'city':city,'relationId':relation_id,'areas':len(areas),'businesses':len(elements),'path':str(target)}))
