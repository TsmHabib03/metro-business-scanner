# Data-source evaluation and policy gates

Research date: 2026-11-24. Official documents were retrieved directly; this report distinguishes published rights from application policy decisions. Implementation update: the public Geofabrik Philippines extract was downloaded and provider-checksum verified. Its ODbL storage/export rights were reviewed before enabling the local adapter. A bounded Makati pilot validates the application; no metropolitan batch scan or Google integration is enabled.

## Recommendation

Build a source-independent MVP around OpenStreetMap data, with a bounded one-city validation and explicit ODbL handling. Use a permitted local extract, a self-hosted Overpass instance, or a contracted endpoint for the application backend. Operator permission is endpoint-specific. The general overpass-api.de Commons guidance discourages sustained app dependency. Private.coffee separately grants commercial use; it was reviewed but timed out during the pilot. Geofabrik local extract is the installed default.

Evaluate Overture Places as a useful open-data alternative before committing to a paid dataset. Its current Places theme is permissively licensed, with source-specific notices, and supports website/contact fields. Philippine coverage and field completeness have not been measured.

Keep Google Places and Foursquare self-service disabled for this prospecting use. A paid enterprise dataset is an option only after its actual contract grants B2B prospecting, persistent storage, enrichment, MapLibre display, and the requested exports. Provider marketing is not a license grant.

## Comparison

| Source | Discovery value | Storage and export | MapLibre | Prospecting decision |
|---|---|---|---|---|
| Google Places API (New) | Search and detail endpoints; website and phone fields depend on requested fields and applicable SKU; no completeness guarantee | General restrictions prohibit bulk extraction and saving names/addresses; place IDs are exempt identifiers; Places coordinates have a specific 30-day cache exception, not a blanket 30-day retention right | Places API content cannot be used with a non-Google map | Disabled under standard terms; seek a specific written agreement before reconsidering |
| OSM / Overpass | POIs with tags, coordinates, and sometimes website/public business contacts; uneven coverage and freshness | ODbL permits use, storage, adaptation, and distribution subject to attribution and applicable share-alike/access obligations | Yes, subject to data and basemap licenses | Recommended MVP foundation after endpoint, boundaries, attribution, and distribution policy are recorded |
| Overture Places | Release-based place dataset with names, categories/taxonomy, coordinates, websites, socials, phones, and emails where available | Current Places documentation identifies CDLA Permissive 2.0 and Apache 2.0; preserve per-source license/notice obligations, including CC0 sources | Yes, with source notices and separately permitted basemap | Strong evaluation candidate; pin release and schema, verify notices and coverage before enabling |
| Foursquare Places self-service API | Global POI search/details | Account-specific caching guidelines; no bulk third-party data supply; attribution required | Map display rights alone do not resolve prospecting restrictions | Disabled: EULA §2.5.4 prohibits using data to contact businesses as prospective customers |
| Foursquare Places Pro enterprise dataset | Product page describes targeted B2B lead generation and flat-file/API delivery | Governed by negotiated subscription and agreement, not the self-service API EULA | Must be expressly confirmed in the applicable contract | Candidate for commercial licensing; no signed agreement or coverage validation exists |
| Data Axle / local licensed providers | Potential business datasets; Philippine coverage not established here | Must confirm territorial coverage, storage, CRM use, contact rights, enrichment, exports, and downstream access in writing | Contract-dependent | Not verified; the attempted Data Axle page returned HTTP 403, and no applicable Philippine offer was established |

## Google Places findings

The [Maps Platform terms](https://cloud.google.com/maps-platform/terms) §3.2.3(a) prohibit exporting, extracting, or otherwise scraping Maps content for use outside the services, including bulk places downloads and copying/saving business names or addresses. Calling the authorized API does not override these downstream restrictions.

Other relevant clauses:

- §3.2.3(b): caching only where expressly permitted by service-specific terms.
- §3.2.3(c): restrictions on creating content from Maps content; its examples specifically prohibit using Places latitude/longitude for point-in-polygon analysis.
- §3.2.3(d)(iii): restrictions on listings/directory services and creating or augmenting an advertising product. This creates an additional use-case concern for an independent prospecting database.
- §3.2.3(e): non-Google-map restrictions.

The [service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) §14 permit Places API display without a corresponding Google map, but prohibit use with a non-Google map. §14.3 allows temporarily caching Places latitude/longitude for up to 30 consecutive calendar days. It does not authorize persistent names, addresses, contacts, website fields, or CSV lead lists.

The same document has a distinct §15 exception allowing **Places UI Kit** with non-Google maps. This is a different product and does not authorize constructing this scanner's persistent prospect database or bulk exports. Do not generalize its exception to Places API.

The [Places policy page](https://developers.google.com/maps/documentation/places/web-service/policies) confirms storage restrictions, the place-ID exception, Google attribution for non-map displays, third-party attribution where applicable, and public terms/privacy requirements. Storing an exempt identifier does not cure an otherwise prohibited use case. Do not copy Google content into an OSM/manual record, feed its coordinates into barangay assignment, or retain it in logs, analytics, exports, or job payloads.

The [usage and billing page](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) documents request/SKU billing and quotas. A field mask can select a higher-priced SKU. If a permitted integration is later negotiated, use minimal field masks, project/method quota limits, cost reservation before requests, and application hard caps; cloud budget alerts alone are not a hard spending limit. Exact prices/free thresholds should be verified against the account and current price list at activation. No cost or completeness claim is made here.

## OSM / Overpass findings

The [OSM copyright page](https://www.openstreetmap.org/copyright) identifies ODbL and requires OpenStreetMap/contributor credit and disclosure of the license. Open data rights are separate from free access to hosted services or tiles.

The [ODbL text](https://opendatacommons.org/licenses/odbl/1-0/) matters beyond a footer:

- §4.2: database distribution includes the license/URI and relevant notices.
- §4.3: publicly used Produced Works require an associated notice.
- §4.4: publicly used Derivative Databases are subject to share-alike; substantial extraction into a new database can constitute a derivative.
- §4.5: independent Collective Databases and internal organizational use have specific limits/exceptions; a separate SQL table alone does not prove independence.
- §4.6: public use of a derivative database or a Produced Work from it can require offering a machine-readable database or alteration file.
- §4.7: additional restrictions cannot strip the licensed database's rights; access control by itself does not erase obligations.

Use [OSMF community guidelines](https://osmfoundation.org/wiki/Licence/Community_Guidelines) and [attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) when determining boundaries between source data, normalized OSM derivatives, independent operator notes, and exports. Review whether geographic assignment/enrichment creates a derivative and whether the chosen distribution invokes sharing. Keep independent notes separate for provenance and privacy, while treating independence as a substantive licensing question. Do not promise that private CRM data is automatically exempt because it occupies another schema.

Proposed distribution policy: maintain an OSM-derived dataset with ODbL notices and a reproducible transformation/version record; produce its licensed machine-readable distribution/alteration offer when required. Export operator-authored CRM notes separately only after independence and recipient rights have been resolved. Avoid combined exports until this policy is verified. MVP default is an internal single-organization pilot; public SaaS or cross-organization sharing requires a fresh ODbL review.

The [Overpass operator's Commons policy](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) gives broad safety guidance of roughly 10,000 requests and less than about 1 GB downloaded per day, discusses dynamic slots/cooldowns, HTTP 429, and HTTP 504 resource denials. These are not guaranteed quotas or permission to build a commercial backend on the public service. The policy explicitly discourages that dependency. Production and sustained metropolitan expansion should use a self-hosted/contracted service or appropriately acquired regional extract.

For a public-endpoint validation, verify the selected operator's permission first and use a small, manually initiated bounded trial. Proposed app limits are one in-flight request, at most 20 requests/50 MB per pilot scan, no automatic recurring schedule, a minimum cooldown, and bounded jittered retries. These are application safeguards, not provider-granted entitlements. Respect operator status and never rotate endpoints/IPs to evade throttling.

OSM facts can omit websites or contacts even when a business has them. Report “No website listed by this source” and route it for review rather than declaring a proven absence.

## Overture findings

The current [Places guide](https://docs.overturemaps.org/guides/places/) identifies a November 2026 release, permissive licenses, source provenance, monthly release delivery, and a revised taxonomy/basic_category model. It states the Places theme contains no OSM data and does not carry ODbL share-alike obligations. Other Overture themes have different licenses; do not apply Places rights to divisions, transportation, or buildings.

The [attribution page](https://docs.overturemaps.org/attribution/) lists current source requirements, including Foursquare data under Apache 2.0, its notice and transformation statement, and other Places sources under CDLA or CC0. [CDLA Permissive 2.0](https://cdla.dev/permissive-2-0/) §2.1 requires making the license text available with shared data; [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0) §4 includes license, notices, and modification requirements. Review the release's actual LICENSE/NOTICE files before import/export.

If selected, use a release-pinned local, bounded area extract; preserve GERS identifiers, release version, sources, applicable licenses, taxonomy version, and confidence metadata. Source confidence is not a website opportunity score. Measure Makati coverage and contact/website completeness in the pilot; no Philippine completeness is currently established. Do not scrape upstream sources yourself.

## Licensed-provider findings

Foursquare distinguishes self-service APIs, enterprise data products, and open-source distributions. These are different rights regimes.

- The official [self-service API EULA](https://foursquare.com/legal/terms/apilicenseagreement/) §2.5.4 expressly prohibits using Places Data to contact listed businesses as prospective customers; §2.5.2–3 restrict bulk third-party availability and systematic extraction. §2.1 refers caching/rate limits to account-specific guidelines, which could not be retrieved in this session.
- The [Data Authorization Agreement](https://foursquare.com/legal/terms/eula/) §4.2 allows lead generation only when expressly authorized by the subscription. The URL ending in `/eula/` is titled “Data Authorization Agreement”; it is not the self-service API EULA.
- The [Places product page](https://foursquare.com/products/places/) advertises Places Pro for targeted B2B lead generation. That justifies requesting an enterprise quote/agreement, not activating a self-service API key.

For any licensed provider obtain a contract covering: Philippines/Metro Manila; named fields; permitted B2B outreach/prospecting; persistent storage and backups; retention after termination; derived website assessments; entity matching; geographic processing; MapLibre display; CSV/XLSX export; export recipients and limits; attribution; quotas; update/deletion feeds; sublicense/team access; public contact use and privacy obligations. Request a licensed sample with its own evaluation-use rights. Do not contact vendors automatically; this research authorizes no outbound messages.

## Geography and basemap dependencies

The [PSA Philippine Standard Geographic Code](https://psa.gov.ph/classification/psgc) is the intended authoritative reference for current LGU/barangay names and codes. Direct retrieval returned HTTP 403; no current codes, counts, boundary geometry, or redistribution rights were verified. PSGC names/codes and polygon geometry are separate assets with separately documented provenance. Import a current approved reference and boundary source before enabling live geographic scans.

District can mean NCR administrative groupings, congressional districts, or city-local districts. It is not a universal city → district → barangay hierarchy. Version district definitions and memberships separately; propose city-local districts where officially defined, with explicit alternatives and no district filter where none is defined. Validate the current Taguig/Makati boundary and barangay assignments rather than hard-coding historical EMBO membership.

MapLibre is a renderer, not a basemap license. Proposed hosted vector tiles: a suitable MapTiler plan or another contracted/self-hosted source. The retrieved [MapTiler terms](https://www.maptiler.com/terms/) §6 require MapTiler attribution and OSM attribution where applicable; paid plans, keys, traffic, caching, and permitted use still need activation review. Do not use OSM community tile servers as an assumed free production backend. Browser map failure must leave the results list usable.

## Enforced permission model

Every adapter has a versioned policy with explicit capabilities: discover, persist identifiers, persist named fields, retain raw payload, spatially process, check websites, show on MapLibre, use for prospecting, export CSV, export XLSX, share with specified recipients, and mix/derive. Unknown is denied. A credential or HTTP 200 response is not approval.

The source policy includes evidence URLs, applicable agreement/account/region, reviewer, review time, expiry/review-due date, retention and deletion instructions, attribution/license bundle, endpoint terms, request/byte/spend limits, and permitted field allowlists. Sources can be proposed, verified, suspended, rejected, or expired.

Apply the current policy at scan preview, start, every request, normalization/persistence, website job, map serialization, statistics, and export generation/download. Jobs pin the policy/boundary versions for audit, but recheck current suspension/expiry before acting. No cached response, normalized field, derived score, browser storage, log, or export bypass may evade restrictions. Restricted sources stay out of generic durable tables.

## Preconditions before any live scan

1. Choose pilot city, audience/distribution model, endpoint and source; record applicable terms and actual rights.
2. Verify current city/barangay reference, relevant district definition, boundary license and geometry/version.
3. Approve field storage/retention, website assessment, attribution, and export/derivative handling; unknown rights remain denied.
4. Configure credentials safely, endpoint budgets, cooldown, cancellation, deletion, and monitoring.
5. Pass fixture-based denial/idempotency/SSRF/export checks and validate a synthetic end-to-end run.
6. Run one bounded live pilot only when all preceding gates pass. Metropolitan schedules and bulk scanning remain disabled until pilot acceptance.

Published-license research is complete for the cited sources. Deployment permissions and coverage are not fully verified, so this document does not authorize bulk scanning.

## Retrieval evidence

Local HTML and text snapshots reside in `docs/research/`. Successful retrieval alone does not prove a complete applicable agreement. Snapshots are research material, never prospect data; exclude them from application bundles. A snapshot manifest records URLs, timestamps, and hashes. Failed retrievals include the Foursquare developer usage/overview pages, initial redirect target, Data Axle page, and PSA PSGC page. These gaps remain explicitly unresolved.

## Activated MVP source ? 2026-11-24

Geofabrik [download terms](https://www.geofabrik.de/data/download.html) explicitly state: ?You may use the data for any purpose, but you have to acknowledge OpenStreetMap as the data source. Derived databases have to retain the same license.? The public Philippines PBF excludes contributor username/user-ID/changeset metadata. The saved terms snapshot SHA256 is `9ec19dc79a43c96a603ae546e1c78e72ec8811eeb797f2098451f59e461a8dec`.

The extract source timestamp is 2026-11-23T21:21:17Z; SHA256 `a26442065b86242a657b764eca423e3c54e43402f1f3263b7d12f1a838172a0c`; provider MD5 matched. Download provenance stays in `.local-data/extract-manifest.json`; each discovered record carries snapshot/transport evidence. Scans are local, bounded to one city/subarea and one category, with a 200-record maximum. Local bundles are reproducible using `scripts/extract-city.py`.

The local application persists normalized OSM facts, including derived boundary assignment, as OSM-derived data. CSV has attribution and license columns; XLSX has a license sheet. CRM notes/status remain local and are omitted from OSM exports. Public service deployment and combined CRM distribution need a separate review. The policy review expires after 90 days; renewal requires inspecting current terms and updating the recorded evidence.

Private.coffee terms dated 10 April 2026 explicitly permit commercial projects and require optimized queries, limited concurrency and no personal information in queries. Snapshot hash: `0be79668423e1bc2fdb56a30114759c2f3540024f325b446dca79fe11e470e90`. The optional online adapter serializes requests at 10-second spacing, caps requests at 40/day and response size at 8 MB. Endpoint rotation is not implemented.

OSM standard raster streets are optional, activated by a human button in the browser. The tile policy was reviewed: attribution, browser Referer and normal cache behavior are retained; no prefetch, offline download or headless tile panning. The default coordinate plot makes no tile requests.
