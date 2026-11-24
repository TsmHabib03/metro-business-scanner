# Map-first discovery, social profiles, and deployment plan

Execution status on 2026-11-24: phases 1–5 are implemented, with independent clustered map/list/details, source-listed social profiles, protected drawers and skeleton/spinner feedback. Phase 6 includes a tested private production image, Compose/TLS/access configuration and recovery guide. Actual HTTPS launch awaits the host/domain and reviewed basemap configuration. The original planning evidence and acceptance criteria are retained below for traceability.

## Job and outcome

Give a solo website developer a fast way to explore discovered Metro Manila businesses by location, inspect their available website/contact/social evidence, and save notes for preparing a website demo. This is an Operate surface: finding and researching a useful prospect is the main task.

Success means opening discovery directly into an interactive map, selecting a business from either the map or its synchronized results list, seeing every available source-listed social profile, and understanding whether a scan, search, or save is still working.

## Evidence from the current application

- The database currently contains 136 discovered records, all with coordinates. These are discoveries, not a census of businesses.
- MapView receives the current 50-row list page. Changing list pages changes which markers exist.
- Business selection is resolved from those same list rows, so an independent map needs a detail endpoint.
- The normalized Business contract contains one `social` string. Retained source tags contain additional profiles. Empire Dental PH has Facebook and Instagram, but only Facebook appears in its record.
- Six of the 136 records contain explicit social data, including two OSM records named Ohana Dentistry. The upgrade can reveal existing profiles immediately; it cannot promise social coverage for every business.
- The saved visual system uses white working surfaces, slate navigation, teal selection, Inter, compact controls, and explicit evidence labels. Keep that identity and change the discovery composition.
- Git currently resolves to `C:/Users/Habib` and its origin points to First-Repo. This project must get its own Git root before publishing to the new repository.
- The server deliberately permits local access only. Compose currently runs PostGIS, while Node and the Python extraction scripts run on the host. Hosting requires a production application image and access configuration.

## Proposed experience

Desktop composition:

```text
Navigation | Discovery / compact dataset statistics
           | Search | Record filters | New scan | Export
           |-------------------------------------------------
           | Business results | Large interactive street map
           | Independently    | Clusters, opportunity markers,
           | scrolling list   | legend, zoom, fit results
           |                  | Selected Business record drawer
           |-------------------------------------------------
           | Actual scan stage / elapsed time / cancel
```

The map is the default discovery surface. A compact, independently scrolling business list stays beside it. Clicking a list item highlights and locates its marker; clicking a marker selects the same record and opens the Business record drawer. On medium screens the drawer overlays part of the map instead of forcing four narrow columns. A full list view remains available for detailed sorting and keyboard research.

Move the tall scan form into a New scan drawer with city, district/barangay, category/custom tag and record limit. Record filters remain distinct from scan scope: filtering stored businesses does not start discovery. Keep scan stages and cancellation visible after the drawer closes.

On phones, put search and the map in the first viewport. Show businesses in a collapsible bottom sheet with accessible expand/collapse controls; open a selected Business record as a full-screen sheet with a clear return action. Filters and scan configuration use their own sheets.

Use a restrained street basemap with readable labels. Opportunity markers reuse the existing five website-state colors and include a text legend. Selected markers get a distinct outline. Low-zoom clusters show counts; clicking expands them. Businesses sharing a coordinate remain selectable through a nearby-business list. Provide Fit results and an explicit Filter to visible area action. Panning alone preserves results and does not scan.

## Implementation sequence

### 1. Establish the project repository and baseline

- Initialize Git inside this project only. Verify its root before staging.
- Inspect the target repository at `https://github.com/TsmHabib03/metro-business-scanner.git` before choosing how to connect its history; preserve any existing remote files.
- Review staged files and exclude secrets, dependencies, local extracts/caches, database files, and generated review output. Preserve the README instead of appending a second title.
- Record the existing scan-speed baseline, migration state and desktop/mobile screenshots. Keep the recent preparation, cancellation and polling improvements.

Completion: a project-only repository with the correct remote and a clean, reviewable source change set. Source publishing and production hosting are separate steps.

### 2. Add complete source-listed social profiles

- Add a shared `SocialLink` contract with platform, normalized URL and originating source field. Expose `social_links` on API responses while preserving the legacy `social` field for compatibility.
- Derive source links from retained tags, the legacy field and social URLs in website fields. Deriving at the API boundary avoids duplicating already stored source facts and makes existing records work without rescanning.
- Support explicit Facebook, Instagram, TikTok, YouTube, LinkedIn, X/Twitter and recognized public messaging links where present. Normalize a username only when its source tag identifies the platform. Accept safe HTTP(S) links, validate platform hostnames, deduplicate canonical equivalents and retain malformed source evidence for review without making it clickable.
- Use the same recognition rules in website classification so an additional social profile does not hide a listed independent website or produce conflicting labels.
- Add a Social profiles section to Business record with labeled platform links, alongside website, address, phone, email, source and prospect notes. Missing data reads Not listed.
- Include normalized source profiles in permitted CSV/Excel exports and preserve attribution. Test escaping for untrusted exported values.
- Optional follow-up: allow manually added research links in a separate prospect-owned table with their own provenance. Discovery must not overwrite those links or imply the source supplied them.

Completion: Empire Dental PH displays both existing profiles; a platform-tagged username opens the correct platform; unsafe or ambiguous values never become invented accounts.

### 3. Decouple map data from list pagination

- Add `GET /api/map-features` returning lightweight GeoJSON, total matching records, returned points, missing-coordinate count and an explicit completeness indicator.
- Add `GET /api/businesses/:id` for marker selection outside the current list page.
- Reuse one validated filter builder across list, map and exports. Add optional validated bounding-box filtering for stored records using the existing PostGIS geometry/index.
- Keep list pagination at 50 records. Map results are independent and contain every matching discovered point for normal MVP dataset sizes.
- Guard oversized map payloads, initially at 10,000 points. Above that threshold show a clear coverage notice and require a narrower area/filter; never silently label a partial response as all businesses. Viewport/server clustering is the later scaling path.
- Use MapLibre GeoJSON layers and built-in clustering rather than a DOM element for every business. Fetch full business details only on selection.
- Preserve camera position during scan polling, note/status updates and list pagination. Fit automatically on first meaningful dataset load; later fitting is an explicit user action.
- Configure a reviewed basemap provider with attribution, permitted browser-key scope, quotas and caching. Do not make OSM community raster tiles the assumed production backend.

Completion: a matching dataset larger than 50 has all its points available independently of list pages, and selecting an off-page marker opens the correct record. Map failure leaves the list usable.

### 4. Implement the map workspace and loading feedback

- Extract focused components for the discovery toolbar, results list, map, record drawer, scan drawer and asynchronous feedback.
- Apply the proposed desktop/mobile composition using the existing tokens and components. Keep statistics compact and preserve source/evidence wording.
- Keep URL-backed search/filter state. Debounce typing and cancel or ignore obsolete requests so rapid changes cannot display a previous query as the latest result.
- Preserve unsaved notes when selecting records or closing drawers; provide a concrete save/discard choice when necessary.

| Situation | Visible feedback | Recovery/behavior |
|---|---|---|
| Initial records load | Realistic result-row skeletons | Replace with records, empty state or error |
| Map startup | Map-specific loading overlay | Expose retry and usable list on failure |
| Search/filter change | Inline spinner and updating label; pending list treatment | Preserve map context; do not present old counts as new results |
| Business selection | Detail skeleton when uncached | Keep selection visible; reject late responses for old selections |
| Running scan | Spinner, actual stage, elapsed time, saved count and Cancel | Preserve the current fast scan implementation |
| Save/check/export/area load | Spinner in the initiating control and action-specific status | Prevent duplicate actions; show completion or retryable error |
| Empty result/source failure | Plain explanation tied to the active scope | Clear filters, retry or open scan configuration |

Use `aria-busy`, concise live announcements, visible focus, keyboard-accessible list selection and drawer focus restoration. Respect reduced-motion preferences. Do not force minimum loading delays or invent scan percentages.

Completion: each asynchronous action is visibly active and reaches success, error or cancellation. The mobile map appears before the long scan form, and list/map/detail remain synchronized.

### 5. Validate the upgraded one-city workflow

- Run TypeScript/build checks and the existing Node/Python tests appropriate to the changed scan and data paths.
- Add meaningful parser/filter/API tests for multiple social profiles, unsafe hostnames, platform usernames, map/list filter parity, more than 50 points, invalid coordinates, missing records and late request responses.
- Exercise one-city scan, search, filter, cluster expansion, overlapping markers, off-page selection, notes/save, website check, cancellation and licensed exports. Confirm existing fast repeat scans remain fast; measure map and search separately.
- Exercise initial loading, slow responses, empty results, database/API failure and basemap failure using controlled test responses.
- Inspect desktop and mobile together, fix observed issues in one batch, then confirm in a bounded second pass. Apply the Impeccable finish review and update the implementation brief/documentation after the build.
- Automated tests block `https://tile.openstreetmap.org/**`; use a controlled local/fixture basemap for automated map interaction checks.

Completion: the core prospecting path works on desktop and mobile without horizontal overflow, inaccessible records, hidden pending operations or scan-speed regression.

### 6. Prepare hosting, then publish and launch

Assumption pending hosting preferences: a private single-user tool on a small VPS using Docker Compose. Shared accounts require a separate workspace/ownership design; a frontend-only host does not run this complete scanner.

- Build a production image containing the React build, Node application and required Python/native extraction dependencies. Run one scan worker through the existing application process; do not add uncontrolled worker replicas.
- Compose the application, PostGIS and a TLS reverse proxy. Keep database and application ports private; expose only the proxy. Mount persistent database and source/cache volumes.
- Add private login/access enforcement for records, scans, source setup, checks and exports; secure sessions, request-origin/CSRF handling and action limits. Replace loopback-only checks with explicit production host/origin configuration behind the trusted proxy.
- Separate production secrets from source, rotate development credentials, and provide environment documentation. Add health checks, logs, restart handling, backups and a tested restore/rollback procedure.
- Bootstrap the approved extract/cache in a controlled setup job and verify checksum/source age. Do not commit the local data bundle or trigger a new bulk scan as part of deployment.
- Recheck the chosen basemap plan and hosted data-display/storage/export policy for the actual private deployment. Update source-policy privacy copy to reflect server-side storage instead of claiming records stay on this computer.
- Add CI for build/tests and document deployment commands. Publish reviewed source to the project repository, then launch to the selected host when its configuration is concrete.

Completion: private HTTPS access works, unauthenticated API actions are denied, a bounded scan works after container restart, existing records persist, backups restore, and attribution is visible.

## Boundaries and open decisions

This upgrade uses the working OSM source and bounded scan behavior. It does not connect Google Places, scrape Google Maps/social pages, infer missing profiles, claim complete business coverage or establish government registration. Building automated demo websites is a later feature; this upgrade supplies the research record for that work.

Open choices are private versus shared access, hosting provider/domain and the approved production basemap plan. Private single-user VPS hosting is the planning assumption until the user specifies otherwise. Complete the local map/social/loading upgrade before spending or provisioning production services.

Validation results are in docs/validation/map-workflow-result.json, map-interactions-result.json, scan-feedback-result.json, export-result.json and deployment-result.json. Desktop/mobile scan fixtures verified start spinners, actual stage/count polling, cancellation and history retry without writing records. Browser interaction fixtures verified independent/off-page markers, clusters, overlap choices, late-response protection and API/basemap recovery. Read-only export checks verified social profiles and license attribution in CSV/Excel. The container check saved 22 Makati dental records in 482ms, enforced private access and cross-origin denial, retained notes through restart and restored a PostgreSQL backup. Impeccable finish review returned ship; reviewer/documenter assignments failed in the harness and their prescribed degraded passes ran inline. Source publication is the final local step; actual hosting launch awaits server/domain configuration.
