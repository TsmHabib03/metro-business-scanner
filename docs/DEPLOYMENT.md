# Private deployment

Run one private workspace on a Linux VPS with Docker Compose, PostGIS and Caddy. GitHub publishes source; a server and domain run the application. This workspace has not been launched to a public host.

## Configure and start

Use Docker Engine/Compose, approximately 4 GB RAM and at least 10 GB free disk for the image, database and reusable extract. Point a domain to the server and allow incoming ports 80/443. Keep one app instance: its process runs the scan worker.

```sh
git clone https://github.com/TsmHabib03/metro-business-scanner.git
cd metro-business-scanner
cp deployment/.env.example deployment/.env.production
chmod 600 deployment/.env.production
```

Edit the environment file: set `DOMAIN`, `ACCESS_USERNAME`, and two different random 32-byte hex secrets for `DB_PASSWORD` and `ACCESS_PASSWORD`. Hex avoids database URL escaping. The access password requires at least 20 characters. Keep the populated file private and out of Git.

```sh
docker compose --env-file deployment/.env.production -f compose.production.yaml config --quiet
docker compose --env-file deployment/.env.production -f compose.production.yaml up -d --build
docker compose --env-file deployment/.env.production -f compose.production.yaml ps
```

Open your HTTPS domain. The browser requests the private credentials using HTTP Basic authentication over HTTPS. Every UI/API route is protected. This single-owner deployment has no account management/logout screen; browser credentials may remain cached until the browser session closes. Cross-origin writes and cross-site requests are denied. Twenty failed logins trigger a ten-minute limit; behind this single proxy, that limit can apply to the whole workspace.

The authenticated app healthcheck checks PostgreSQL. Caddy starts after the app is healthy. Database/app ports remain private inside Compose. Database, source data and TLS certificates use persistent volumes.

## Install approved discovery data

Setup downloads the Geofabrik extract, checks the provider checksum, computes SHA-256 and records source timestamp/license. It prepares source data without starting a business scan. Begin with Makati and one bounded category scan after preparation.

```sh
docker compose --env-file deployment/.env.production -f compose.production.yaml exec app /opt/python/bin/python scripts/setup-extract.py
docker compose --env-file deployment/.env.production -f compose.production.yaml exec app /opt/python/bin/python scripts/extract-city.py Makati
```

First indexing takes several minutes; later scans reuse city bundles. The permission review expires after 90 days: recheck current terms and update evidence/policy before it expires.

To transfer the installed source instead, copy `extract-manifest.json`, `philippines.osm.pbf`, `metro-boundaries.json`, `metro-businesses.json` and prepared city JSON files to a private `source-transfer` directory on the server. Validate the PBF against the manifest SHA-256. Then copy into the source volume:

```sh
docker compose --env-file deployment/.env.production -f compose.production.yaml cp ./source-transfer/. app:/app/.local-data/
docker compose --env-file deployment/.env.production -f compose.production.yaml exec -u root app chown -R node:node /app/.local-data
```

Transfer existing business records/notes separately using PostgreSQL backup/restore below. Do not commit extracts or database dumps.

## Street basemap

Markers and clustering work without street tiles. Hosted **Show streets** requires an approved raster provider. Set `VITE_MAP_TILE_URL` with `{z}/{x}/{y}` and `VITE_MAP_ATTRIBUTION`, verify plan/quotas/attribution/caching terms and rebuild. These values become public browser configuration; restrict browser keys to your domain. Community OSM tiles are an opt-in local fallback. The app does not scrape Google Maps or display Google Places data on MapLibre.

## Backups and recovery

Store encrypted, access-controlled backups off-server. Back up the database before updates and preserve source data and the environment separately. These commands write the binary dump inside the container, avoiding Windows PowerShell binary redirection:

```sh
mkdir -p backups
docker compose --env-file deployment/.env.production -f compose.production.yaml exec -T db pg_dump -U scanner -d metro_scanner -Fc -f /tmp/metro.dump
docker compose --env-file deployment/.env.production -f compose.production.yaml cp db:/tmp/metro.dump ./backups/metro.dump
```

Restore into a separate database and inspect counts before switching the app:

```sh
docker compose --env-file deployment/.env.production -f compose.production.yaml cp ./backups/metro.dump db:/tmp/metro.dump
docker compose --env-file deployment/.env.production -f compose.production.yaml exec -T db createdb -U scanner metro_restore
docker compose --env-file deployment/.env.production -f compose.production.yaml exec -T db pg_restore -U scanner -d metro_restore --no-owner /tmp/metro.dump
docker compose --env-file deployment/.env.production -f compose.production.yaml exec -T db psql -U scanner -d metro_restore -c 'SELECT count(*) FROM businesses; SELECT count(*) FROM prospects;'
```

After review, stop the app, change its `DATABASE_URL` database name through a deployment override and recreate it. Preserve the original DB. Avoid `down -v`, which removes persistent data.

## Updates and inspection

Back up first, record the current commit and retain its tagged image. Pull the new revision and repeat `up -d --build`. Migrations apply at startup; reverting code does not undo migrations. Check schema compatibility or restore the pre-update backup for rollback. Restarting preserves records/notes and requeues interrupted scans.

```sh
docker compose --env-file deployment/.env.production -f compose.production.yaml logs --tail 100 app
docker compose --env-file deployment/.env.production -f compose.production.yaml restart app
```

`docs/validation/deployment-check.mjs` uses isolated throwaway containers to validate authentication, bounded Makati scanning, restart persistence and backup restoration. It never connects a second worker to the live workspace database.
