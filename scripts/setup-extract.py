"""Download and checksum the public Geofabrik Philippines OSM extract.
Install requirements first: python -m pip install --target .local-tools -r scripts/requirements.txt
"""
import pathlib, urllib.request, hashlib, json, datetime, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.local-tools'))
import osmium
url='https://download.geofabrik.de/asia/philippines-latest.osm.pbf'
folder=ROOT/'.local-data';folder.mkdir(exist_ok=True)
target=folder/'philippines.osm.pbf'
expected=urllib.request.urlopen(url+'.md5',timeout=30).read().decode().split()[0]
if not target.exists() or hashlib.file_digest(target.open('rb'),'md5').hexdigest()!=expected:
    print('Downloading approximately 600 MB from Geofabrik...',flush=True)
    temp=target.with_suffix('.download')
    with urllib.request.urlopen(url,timeout=60) as response, temp.open('wb') as output:
        while chunk:=response.read(1024*1024): output.write(chunk)
    if hashlib.file_digest(temp.open('rb'),'md5').hexdigest()!=expected: raise SystemExit('Provider checksum mismatch. Run setup again.')
    temp.replace(target)
reader=osmium.io.Reader(str(target))
timestamp=reader.header().get('osmosis_replication_timestamp');reader.close()
if not timestamp: raise SystemExit('Extract has no source timestamp; inspect the header before enabling it.')
manifest={'url':url,'sha256':hashlib.file_digest(target.open('rb'),'sha256').hexdigest(),'providerMd5':expected,'downloadedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'dataTimestamp':timestamp,'license':'ODbL-1.0','permissionUrl':'https://www.geofabrik.de/data/download.html','policyReviewedAt':'2026-11-24','permissionEvidence':'docs/research/geofabrik-terms.html'}
(folder/'extract-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print(json.dumps(manifest,indent=2))
