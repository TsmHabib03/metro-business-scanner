# MVP delivery and next steps

Implemented: React catalog interface, verified OSM source policies, local Geofabrik adapter and optional bounded Overpass adapter, PostgreSQL worker, city/subarea/category controls, website evidence, prospect notes/status, CSV/Excel export, map and scan history.

Validation: a bounded Makati pilot precedes expansion. All 17 municipalities are selectable; their first extraction must assemble a unique OSM city polygon or stop. Barangay/district coverage depends on available OSM relations and is not government-certified.

Next stages:

1. Measure coverage and website/contact completeness with Makati users; verify additional cities individually.
2. Add a licensed provider only after a contract grants this prospecting/storage/export use.
3. Launch the tested private single-owner Compose stack after choosing a host/domain and reviewed street provider. Team use still requires workspace ownership, shared worker coordination and a fresh source/distribution review.
4. Add quality assessment beyond availability only with explicit, evidence-based checks.

The original planning acceptance packet is retained below as an expansion reference.

---

# Implementation roadmap

Status: proposed research-to-MVP plan. Makati, solo agency use, and OSM-first are planning assumptions awaiting user input. No live scan is authorized by this document. Estimates are effort ranges for one experienced full-stack developer; external licensing and geographic-data lead times are excluded.

## Phase 0: activation decisions and policy verification

**Deliverables:** select audience/distribution model and pilot city; record actual endpoint/operator rights, field retention/deletion rules, attribution and ODbL distribution treatment; verify reference codes and licensed current boundaries; select licensed basemap and hosting/cost ceilings. Confirm the Impeccable interface direction. Estimate: 2–5 working days after necessary documents/data are available.

OSM acquisition options are a permitted local extract, self-hosted Overpass, or a contracted endpoint. A public instance is a bounded validation option only with the selected operator's permission. Evaluate a release-pinned Overture Places sample as a separate source with its actual notices and permitted evaluation rights. A proprietary provider must explicitly permit B2B prospecting, durable storage, website assessments, MapLibre display, team access, and intended export recipients. Google Places and Foursquare self-service remain disabled under the researched standard terms.

**Exit gate:** a reviewed, unexpired policy exists for each enabled action/field, verified pilot geography is available, endpoint quotas and record/byte/spend caps are defined, and license/attribution assets are ready. Unknown capabilities remain disabled. No API key alone satisfies this gate.

## Phase 1: foundation and synthetic vertical slice

**Deliverables:** npm workspace; React/TypeScript/Tailwind routes; Fastify API; PostgreSQL/PostGIS migrations; pg-boss worker; authentication; source policy service; fixture adapter; geographic/category controls; scan preview/history; results and business evidence view. Estimate: 4–6 days.

Use clearly labeled synthetic records and geometries for development, with no implied real PSGC code or coverage. Launch locally with fixture discovery as the default; provider credentials are unnecessary. Preserve filters, sorting, selection and provenance across table/detail/map routes. Every denied action has a clear reason. A failed basemap leaves the list usable.

**Exit gate:** one synthetic scan completes through UI → API → queue → persistence → results, with job restart causing no duplicate business or observation. Zero/one/dense/long-name/missing-coordinate states work. Unknown/revoked policies deny start and persistence, cross-workspace access fails, and cancelling prevents later tasks. Apply and validate migrations in a disposable PostGIS instance. No live adapter is enabled.

## Phase 2: working prospecting MVP

**Deliverables:** OSM adapter behind activation gates, validated custom category mappings, SSRF-safe website reachability worker, evidence-based classifications and opportunity ordering, prospect status/notes, dashboard counts, licensed MapLibre basemap, policy-aware CSV/XLSX exports, retention/revocation cleanup. Estimate: 5–8 days.

The five requested website labels are supported with evidence. Missing websites and inconclusive failures require review; site quality remains a manual judgment. No deep website crawl or automated outreach. OSM-derived data exports include applicable license/access obligations; independent CRM and combined export rights are verified separately. If an export path is unresolved, its UI remains disabled with a reason rather than silently claiming the feature works.

**Exit gate:** fixture tests prove SSRF/redirect/DNS protections, classification uncertainty, policy checks at every boundary, safe spreadsheet serialization, partial scan recovery, atomic quota reservation, bounded retries, and retention propagation through derived results/export files. A keyboard user can complete discovery and prospect editing without the map. Inspect desktop/mobile layouts and correct material failures in bounded passes using Impeccable's build/review workflow.

## Phase 3: bounded one-city pilot

**Deliverables:** manually initiated pilot in the confirmed city, initially a small verified area and two representative categories; coverage/field completeness report; evidence review; request and budget report. Estimate: 2–4 days after gates pass.

Proposed live ceilings are one discovery request in flight, at most 20 requests, 50 MB of source responses, and 500 persisted businesses per pilot scan, with a lower operator/contract limit taking precedence. Website checks have a separate permit/cap (propose at most 50 business URLs, bounded attempts and domain rates). These numbers are conservative application limits, not API-granted rights. Local-extract imports still enforce row/byte/scope limits. No recurring schedule or metropolitan bulk query.

**Acceptance criteria:**

- Every displayed business fact, coordinate, category inference and assessment has source/version/time lineage; expired or revoked facts are excluded.
- All observed usage stays within verified operational limits; no throttling evasion, unauthorized persistence, endpoint rotation, or unbounded website task fan-out.
- Re-running the same permitted source identities and restarting the worker produce no duplicate businesses; partial failure/cancellation produces accurate history.
- Manually inspect up to 50 discoveries, including every available website class and boundary/missing-data case. Review branch matching and obvious stale/source errors; report the sample size and exceptions rather than extrapolating accuracy from a tiny sample.
- An automatic missing-website case is never presented as a confirmed absence; WAF/403/429 cases remain inconclusive. A reachable site is never automatically called poor quality.
- Current city/barangay containment is independently verified for the pilot sample; ambiguous cases remain unassigned or marked for review.
- Permitted CSV/XLSX outputs round-trip multilingual names, phone/code text, newlines and formula-like values; license bundles and recipients match current policy.
- Record discovered counts, website/contact-field completeness, assessment outcomes, and collection scope. These measure source coverage within the sample, not the number of all real businesses or government registration.
- No critical authorization, policy, network-safety, data-loss, or licensing failures remain. Document and resolve material issues before increasing scope.

If the small-area pilot passes, expand incrementally inside the same city within a newly reviewed scope/budget. A city is not marked comprehensively scanned merely because one query returned successfully.

## Phase 4: Metro Manila expansion

**Deliverables:** approved current LGU/barangay references and boundaries for Caloocan, Las Piñas, Makati, Malabon, Mandaluyong, Manila, Marikina, Muntinlupa, Navotas, Parañaque, Pasay, Pasig, Quezon City, San Juan, Taguig, Valenzuela, and Pateros; explicit district definitions; scheduled bounded jobs where permitted; per-area coverage and refresh history. Estimate: 4–7 implementation days plus staged data validation.

Activate a few LGUs at a time. Scale via acquired extracts or self-hosted/contracted infrastructure, with source/account-wide quota accounting. Revisit ODbL sharing if turning the internal tool into SaaS or distributing derivatives. A second source requires its own policy, mapping, provenance and mixing permission; a second organization requires tested tenant isolation. Add recurring scheduling only after verified refresh rights, infrastructure load, budgets and cancellation/revocation behavior are proven.

**Exit gate:** all 17 LGUs can be selected and searched using verified scopes; each scan reports source/version, limits, category support and partial coverage. No claim of complete business coverage. Operational monitoring and restore/deletion drills pass. The first production release can remain single-source/single-organization when that is the confirmed deployment model.

## Delivery checkpoints and unresolved choices

The proposed effort is roughly 17–30 developer days through the pilot and 4–7 further days for metropolitan infrastructure/features, excluding external approvals, data acquisition and design correction rounds. Cost cannot be responsibly priced until hosting, tile traffic, dataset/endpoint, refresh rate and workload are selected. Add a request/byte/spend estimate to every preview and a monthly infrastructure estimate before deployment.

Audience/team size, pilot city, source budget, district definition, hosting, retention duration, source acquisition mode, exports/distribution treatment and visual direction remain open. The planning packet is ready to review; application implementation follows this plan and the user's selected scope.
