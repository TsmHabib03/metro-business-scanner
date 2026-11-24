"""Index existing research snapshots; does not fetch anything from the network."""
import hashlib
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
URLS = {
    "apache": "https://www.apache.org/licenses/LICENSE-2.0",
    "cdla": "https://cdla.dev/permissive-2-0/",
    "foursquare-api-eula": "https://foursquare.com/legal/terms/eula/",
    "foursquare-developer-terms": "https://foursquare.com/legal/terms/enterprise-developermasterterms/",
    "foursquare-places": "https://foursquare.com/products/places/",
    "foursquare-self-service-eula": "https://foursquare.com/legal/terms/apilicenseagreement/",
    "foursquare-terms": "https://foursquare.com/legal/terms/",
    "geofabrik-terms": "https://www.geofabrik.de/data/download.html",
    "geofabrik-philippines": "https://download.geofabrik.de/asia/philippines.html",
    "google-maps-terms": "https://cloud.google.com/maps-platform/terms",
    "google-places-policies": "https://developers.google.com/maps/documentation/places/web-service/policies",
    "google-places-usage": "https://developers.google.com/maps/documentation/places/web-service/usage-and-billing",
    "google-service-terms": "https://cloud.google.com/maps-platform/terms/maps-service-terms",
    "maptiler-terms": "https://www.maptiler.com/terms/",
    "odbl": "https://opendatacommons.org/licenses/odbl/1-0/",
    "osm-attribution": "https://osmfoundation.org/wiki/Licence/Attribution_Guidelines",
    "osm-copyright": "https://www.openstreetmap.org/copyright",
    "osm-guidelines": "https://osmfoundation.org/wiki/Licence/Community_Guidelines",
    "overpass-policy": "https://dev.overpass-api.de/overpass-doc/en/preface/commons.html",
    "overture-attribution": "https://docs.overturemaps.org/attribution/",
    "overture-places": "https://docs.overturemaps.org/guides/places/",
    "private-coffee-overpass": "https://overpass.private.coffee/",
}


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title_parts = []
        self.in_title = False
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "link" and values.get("rel") == "canonical":
            self.canonical = values.get("href")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title_parts.append(data)


def file_metadata(path):
    return {
        "path": path.relative_to(ROOT.parent).as_posix(),
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "snapshot_written_at_utc": datetime.fromtimestamp(
            path.stat().st_mtime, timezone.utc
        ).isoformat(),
    }


snapshots = []
for stem, url in sorted(URLS.items()):
    html_path = ROOT / "research" / f"{stem}.html"
    text_path = ROOT / "research" / f"{stem}.txt"
    parser = Metadata()
    parser.feed(html_path.read_text(encoding="utf-8-sig"))
    snapshots.append({
        "id": stem,
        "requested_or_reconstructed_url": url,
        "canonical_url_in_snapshot": parser.canonical,
        "title": " ".join("".join(parser.title_parts).split()),
        "files": [file_metadata(html_path), file_metadata(text_path)],
        "note": (
            "Legacy filename: actual document is Data Authorization Agreement, not self-service API EULA."
            if stem == "foursquare-api-eula" else
            "Homepage snapshot contains #terms and #privacy. URL reconstructed from snapshot; original HTTP headers were not preserved. Added for implementation permission review on 2026-11-24."
            if stem == "private-coffee-overpass" else
            "Added for implementation permission review on 2026-11-24; filesystem times describe snapshot writes."
            if stem in {"geofabrik-terms", "geofabrik-philippines"} else None
        ),
    })

manifest = {
    "research_date": "2026-11-24",
    "generated_at_utc": datetime.now(timezone.utc).isoformat(),
    "timestamp_basis": "Original HTTP headers were not preserved; file modification timestamps approximate local snapshot write times, not authoritative retrieval or effective dates.",
    "url_basis": "Reconstructed from cited official URLs and canonical metadata; redirects/status headers were not preserved.",
    "scope": "Official policy/product documentation and implementation transport permission evidence. Business scan records and website assessments are stored separately.",
    "snapshots": snapshots,
    "retrieval_gaps": [
        {"url": "https://psa.gov.ph/classification/psgc", "result": "HTTP 403; current codes/counts/boundaries/rights unverified"},
        {"provider": "Data Axle", "result": "Attempted provider page returned HTTP 403; exact attempted URL not preserved; Philippine offer unverified"},
        {"provider": "Foursquare", "result": "Developer overview/usage pages and initial redirect target unsuccessful; exact attempted URLs not preserved; account-specific cache/quota guidelines unverified"},
    ],
}
(ROOT / "research" / "manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
design = {
    "provider": "Impeccable design catalog",
    "purpose": "Labeled inspiration/craft references for planning; not scanner UI comps and not approved product assets.",
    "redistribution_rights": "Not evaluated; development-only references must not ship in the application.",
    "files": [
        {**file_metadata(path), "url": f"https://impeccable.style/worlds/cards/{path.name}"}
        for path in sorted((ROOT / "design-references").glob("*.webp"))
    ],
}
(ROOT / "design-references" / "manifest.json").write_text(
    json.dumps(design, indent=2) + "\n", encoding="utf-8"
)
print(f"Indexed {len(snapshots)} official pages and {len(design['files'])} design references.")
