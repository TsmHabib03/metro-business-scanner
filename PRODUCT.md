# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

User-selected: React, TypeScript, Tailwind CSS, Node.js, PostgreSQL, MapLibre, and background job processing. Implemented additions: PostGIS for geography, Fastify/Vite, and a single-process PostgreSQL-backed background queue.

## Product Purpose

Build an independent business discovery and website prospecting application for Metro Manila. Discover businesses through authorized sources, assess website opportunities with supporting evidence, and maintain a prospect workflow.

## Users

The explicit brief targets people prospecting for website development clients. The MVP supports a solo local workspace or private single-owner HTTPS deployment for a website developer or agency owner. Shared workspaces and multi-user access are deferred.

## Operating Context

Choose an area and categories, review a bounded scan plan, discover businesses, inspect website evidence, save prospect status and notes, and export permitted records. Start with one city and expand only after the pilot passes.

Pilot: Makati. Geography uses assembled OSM city/subarea relations, not government-certified boundaries.

## Capabilities and Constraints

- Cover all 16 Metro Manila cities and Pateros; support city, district, barangay, and individual-area searches.
- Include restaurants, dental clinics, clothing boutiques, beauty salons, gyms, automotive services, schools, other categories, and custom categories.
- Distinguish no website, existing website, unavailable website, website needs review, and social media only. Preserve uncertainty when evidence is incomplete.
- Maintain business name, category, location, website, permitted public business contacts, all available source-listed social profiles, discovery source, prospect status, and notes.
- Provide discovery statistics, an interactive map, search, filters, website-opportunity sorting, scan history, and CSV/Excel export where the source permits it.
- Evaluate Google Places, OpenStreetMap Overpass, and licensed business-data providers before implementation and bulk scanning.
- Respect quotas, licensing, storage restrictions, and attribution. Never scrape Google Maps pages or call undocumented private endpoints.
- A business listing does not prove government registration.
- Research and planning preceded the working MVP authorized by the user?s build-now request.

## Evidence on Hand

The workspace now contains the runnable MVP and official source research reviewed on 2026-11-24. The approved OSM-first path uses a checksum-verified Geofabrik extract; the Private.coffee online pilot timed out. Business counts come from real bounded scans, never fixtures.

## Brand Commitments

Project name: Metro Manila Business Prospecting Scanner. The user explicitly requested the Impeccable design skill. The saved Impeccable selection uses the Library catalog direction, candidate 6, code-led: white workspace, slate navigation, teal selection and Inter Variable.

## Product Principles

- Source rights govern discovery, persistence, display, enrichment, and export.
- Every prospect fact and website assessment retains provenance and observation time.
- Missing source data remains uncertainty; it does not establish that a business has no website.
- Counts describe the discovered dataset, not the total population of businesses.
- A successful one-city pilot precedes metropolitan expansion.

## Open Decisions

Future decisions: the actual hosting provider/domain, hosted street-tile provider, team access, ongoing backup/retention, measured coverage across additional cities, and any paid source agreement. Private hosting configuration and recovery instructions are implemented and container-tested; no public launch has occurred. Google Maps/Places is not connected. OSM coverage is incomplete; no listing proves registration and no empty website field proves absence.
