FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_MAP_TILE_URL
ARG VITE_MAP_ATTRIBUTION
ENV VITE_MAP_TILE_URL=$VITE_MAP_TILE_URL VITE_MAP_ATTRIBUTION=$VITE_MAP_ATTRIBUTION
RUN npm run build

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY scripts/requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/python && /opt/python/bin/pip install --no-cache-dir -r /tmp/requirements.txt
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 PYTHON_COMMAND=/opt/python/bin/python
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY server ./server
COPY shared ./shared
COPY scripts ./scripts
COPY database ./database
RUN mkdir .local-data && chown -R node:node /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node", "scripts/healthcheck.mjs"]
CMD ["node","--import","tsx","server/index.ts"]
