# Metro Manila Business Prospecting Scanner

A working local tool for finding businesses, reviewing website evidence, and maintaining a website-development prospect list. Built with React, TypeScript, Tailwind CSS, Node.js/Fastify, PostgreSQL/PostGIS and MapLibre, with a persistent database scan queue.

**This version searches OpenStreetMap. Google Maps/Places is not connected.** The installed Geofabrik Philippines extract lets scans run locally without an API key or per-scan network requests. Source permission and ODbL storage/export requirements were reviewed before the Makati pilot.

## Open the application

Development UI: **http://127.0.0.1:5173**. API: http://127.0.0.1:3001/api/health.

Discovery opens into a clustered map of matching businesses with a list beside it. Click **New scan**, choose **Makati**, a category and record cap, then **Start discovery scan**. Use **Load districts & barangays** for available OSM subareas. Select a marker or list record to see its website, public details and all source-listed social profiles, then save status and notes. Search/filters, list view, scan history, cancellation and licensed CSV/Excel export are available. Skeletons and spinners show pending searches, records and actions.

The initial Makati dental pilot saved **22 real source records**: **20 no website listed**, **2 needs review**. Source snapshot: **23 November 2026, 21:21:17 UTC**. Its 25 OSM subareas and source relation 103716 were verified against the assembled city polygon. See [pilot results](docs/validation/pilot-result.json).

## Run locally

Requirements: Node.js 24+, Docker Desktop and Python 3.13+. From this directory:

```powershell
npm install
npm run db:start
npm run data:setup
npm run data:city -- Makati
npm run dev
```

The database defaults match [compose.yaml](compose.yaml): loopback port 54330. Migrations apply on API startup. `.env.example` documents optional configuration; the current setup works with the defaults. The extract download is approximately 615 MB. First preparation builds reusable Metro Manila boundary and business indexes and can take a few minutes and about 1 GB of memory. Subsequent cities use the small business index and indexed polygon matching; scans reuse snapshot-matched city bundles in `.local-data`. Python libraries are isolated in `.local-tools`.

For the already-installed workspace, start the database if stopped and run `npm run dev`; do not download the extract again unless refreshing it. City/category searches use the same installed snapshot until it is refreshed.

```powershell
npm run build
npm start
```

After building, `npm start` serves the UI and API together at **http://127.0.0.1:3001**. Local defaults accept loopback access. The production image, PostGIS/Caddy configuration, private HTTPS access and backup instructions are in the [deployment guide](docs/DEPLOYMENT.md). Hosting needs your server/domain; GitHub publishes source only.

## Coverage and evidence

- All 16 cities and Pateros are selectable. Makati has been pilot-tested; bounded dental scans also completed in Quezon City and Pasig during performance validation. Other cities prepare their local bundle on first use. Expand one city at a time and assess coverage before broad scanning.
- Restaurants, dentists, clothing, beauty, gyms, automotive, schools, other shops and custom OSM tags are supported. OSM coverage is uneven and result limits are caps, not a census or guaranteed complete inventory.
- “No website listed” means the source website field is empty. It does not prove a business has no website. A listed website starts as “Needs review”; an individual availability check records whether it responds. Availability checks do not score design quality.
- Public business contacts may be missing or stale. An OSM or Google Maps listing does not prove government registration. OSM geography is not a government-certified PSGC boundary dataset.
- Map points are independent of 50-row list pages and cluster at low zoom. Fit results and Filter visible area control the view/scope. Above 10,000 points the map clearly indicates partial coverage. **Show streets** is opt-in; hosted deployments require an approved configured tile provider. Automated QA blocks community OSM tiles.
- Social profiles come from source tags and recognized social website URLs. Missing profiles stay unknown; the app does not scrape social pages or guess accounts.
- Exports include social profiles, OpenStreetMap attribution and ODbL license information. Notes/statuses stay in your workspace database (local or private server). Preserve attribution and applicable database license requirements when distributing data.
- The optional reviewed Private.coffee Overpass transport timed out during testing on this computer. The installed Geofabrik extract is the working transport. Custom endpoints and expired policy reviews are denied until reviewed.

## Validation and project documentation

`npm test` passes 14 tests covering query boundaries, source policy, deduplication, note preservation, new social evidence, safe social URLs, map bounds, private access, website uncertainty, SSRF protection, licensed exports and preparation/cancellation. `python tests/local_spatial_test.py` passes 2 tests covering exact boundary and overlapping subarea membership. `npm run build` passes; the earlier MVP dependency audit reported zero production vulnerabilities. MapLibre is loaded only for map view and produces a large lazy chunk warning.

Performance validation on this workspace: the original Quezon City dental scan (limit 100) took 266.2 seconds. After preparing the reusable index, the repeat scan saved the same 100 records in 2.45 seconds; a first-use Pasig scan prepared its city bundle and saved 14 records in 2.13 seconds. These are local measurements, not guaranteed timings. The entire Quezon City bundle (14,884 candidates, coordinates, tags and subarea memberships) matched the prior extraction exactly. See [timings](docs/validation/scan-performance-result.json) and [desktop/mobile scan checks](docs/validation/scan-speed-browser-result.json).

New scans start immediately, show preparation stages and elapsed time, refresh active progress every second and announce completion. Starting a scan clears stale record filters that could hide its results. Same-city preparation is shared; different-city preparation is serialized. Cancelling a scan stops its wait and preserves saved records; shared local preparation can finish for reuse and has an eight-minute deadline.

The [pilot validation](docs/validation/pilot-check.mjs) exercises real scanning, geography, prospect persistence, CSV attribution, Excel and cancellation. The [browser validation](docs/validation/browser-check.mjs) checks desktop/mobile records, evidence, saved prospects, downloads, search, map, history and source truth; temporary validation notes/status are restored.

| Document | Contents |
|---|---|
| [Product](PRODUCT.md) | Implemented scope and product constraints |
| [Source policies](docs/SOURCE-POLICIES.md) | Google/OSM/provider research, active permission evidence and restrictions |
| [Architecture](docs/ARCHITECTURE.md) | Current local topology and separately labeled future proposal |
| [Database](docs/DATABASE.md) | Applied MVP schema and separately labeled future schema |
| [Migrations](database/migrations/001_mvp.sql) | Active database structure; `database/schema.sql` remains unapplied |
| [Interface brief](docs/UI-BRIEF.md) | Library catalog direction and implemented interaction contract |
| [Design system](DESIGN.md) | Extracted colors, typography, responsive layout and component rules |
| [Roadmap](docs/ROADMAP.md) | Delivered MVP and staged expansion |
| [Deployment](docs/DEPLOYMENT.md) | Private HTTPS hosting, data setup and recovery |
| [Research manifest](docs/research/manifest.json) | Official-source snapshots and evidence hashes |

Research/design reference assets and downloaded extracts are development material and are excluded from the browser build. The application includes deliberate source/license notices and a self-hosted font.

The repository includes readable policy text and a provenance manifest. Original HTML snapshots and visual calibration downloads stay local; some publisher HTML embeds their own browser keys. The manifest's HTML entries describe retained local evidence, while its text entries are available in the repository.

The map/social upgrade passed desktop/mobile workflow checks, off-page marker selection, overlap choices, stale response protection and controlled API/basemap failures. Desktop/mobile scan fixtures verified spinners, actual stage/count polling, cancellation and history retry. CSV/Excel checks verified profiles and source attribution. Private container validation saved 22 Makati records in 482ms, denied anonymous access and cross-origin writes, retained notes through restart and restored a backup. See [interaction checks](docs/validation/map-interactions-result.json), [scan feedback](docs/validation/scan-feedback-result.json), [exports](docs/validation/export-result.json) and [deployment checks](docs/validation/deployment-result.json). These are local measurements. Impeccable review returned **ship** using its prescribed inline fallback after the review/documenter assignment harness omitted their payloads.
