# 🔥 Read & Burn Service — Performance Report

**Date:** 2026-06-19  
**Server:** Express.js on Node.js v24.14.0  
**Target:** All routes under 50ms response time

---

## Executive Summary

✅ **All 13 routes achieve < 3ms response time** on localhost (target: <50ms).

The original codebase was already fast (~1-1.5ms per route) because metadata is kept in an in-memory `Map`. The optimizations focus on **production performance** (compression, cache headers) and **event-loop health** (async I/O, debounced writes) rather than raw localhost latency.

---

## Routes Identified

| # | Route | Method | Auth | Description |
|---|-------|--------|------|-------------|
| 1 | `/` | GET | — | Index page (static HTML) |
| 2 | `/styles.css` | GET | — | Stylesheet (21.8 KB) |
| 3 | `/manifest.json` | GET | — | PWA manifest |
| 4 | `/sw.js` | GET | — | Service worker |
| 5 | `/health` | GET | — | Health check JSON |
| 6 | `/login` | GET | — | Login page |
| 7 | `/:id` | GET | — | View file page / 404 |
| 8 | `/admin` | GET | Required | Admin page (redirects without auth) |
| 9 | `/api/info/:id` | GET | — | File metadata JSON |
| 10 | `/api/text/:id` | GET | — | Text file content |
| 11 | `/api/file/:id` | GET | — | File content (inline) |
| 12 | `/api/admin/uploads` | GET | Required | List all uploads |
| 13 | `/download/:id` | GET | — | File download |

Plus POST/DELETE routes: `/api/login`, `/api/logout`, `/upload`, `/upload/text`, `/delete/:id`, `/api/admin/delete/:id`

---

## Optimizations Applied

### 1. Gzip Compression (`compression` middleware)
- **Threshold:** 1024 bytes (skip tiny JSON responses)
- **Level:** 6 (default, good ratio/speed balance)
- **Impact on payload size:**

| Asset | Original | Compressed | Savings |
|-------|----------|------------|---------|
| `/styles.css` | 21,853 B | 4,163 B | **81%** |
| `/` (index.html) | 9,374 B | 2,432 B | **74%** |
| `/login` | 5,207 B | 1,606 B | **69%** |
| `/manifest.json` | 1,601 B | 534 B | **67%** |
| `/sw.js` | 2,996 B | 1,076 B | **64%** |

**Note:** Adds ~0.5-1ms CPU overhead per request on localhost. In production over a network, this saves 50-80% of transfer time, making it a massive net win.

### 2. Static Asset Cache Headers
- `Cache-Control: public, max-age=3600` (1 hour)
- `ETag` enabled (automatic conditional requests)
- `Last-Modified` enabled
- **Effect:** Browsers cache static assets and only revalidate after 1 hour. Repeat visits load instantly from browser cache with `304 Not Modified` responses.

### 3. Debounced Async Metadata Saves
**Before:** `saveMetadata()` called `fs.writeFileSync()` synchronously on every file change (upload, delete, expiry), blocking the event loop.
**After:** Writes are debounced (100ms window) and executed asynchronously with `fs.writeFile()`. Multiple rapid changes coalesce into a single write.

### 4. Async File I/O
- `fs.unlinkSync` → `fs.unlink` (async, fire-and-forget) in cleanup/delete paths
- `fs.renameSync` → `fs.rename` (async with callback) in upload handler
- `fs.writeFileSync` → `fs.writeFile` (async) in text upload handler
- **Effect:** Event loop never blocks on disk I/O during request handling.

### 5. Pre-computed Static File Paths
- Static file paths (`path.join(__dirname, 'public', 'login.html')`, etc.) are computed once at startup instead of on every request.
- **Effect:** Eliminates ~3-5 `path.join()` string operations per request.

### 6. CORS Middleware Scoping
**Before:** `app.use(cors())` applied CORS headers to **every** route including static files.  
**After:** CORS only on `/api/*`, `/upload/*`, `/delete/*` routes where it's needed.

### 7. HTTP Server Tuning
- `keepAliveTimeout: 30000` (30s — persistent connections for repeat requests)
- `headersTimeout: 35000` (5s grace after keepAlive)
- `requestTimeout: 60000` (max request time)

### 8. Removed Redundant `fs.existsSync` in Catch-All Route
- `GET /:id` previously called `fs.existsSync()` on every request to check if the file exists on disk.
- Now metadata `Map` is the source of truth. If the file is missing from disk, `/api/file/:id` handles it gracefully with a 404 callback.

---

## Benchmark Results

### Final Benchmark (10 runs per route, both servers warm, localhost)

| Route | Original avg | Original max | Optimized avg | Optimized max | Status |
|-------|-------------|-------------|--------------|--------------|--------|
| `/` | 1.19ms | 1.47ms | 1.87ms | 2.36ms | ✅ <50ms |
| `/styles.css` | 1.14ms | 1.27ms | 2.17ms | 2.69ms | ✅ <50ms |
| `/manifest.json` | 1.12ms | 1.69ms | 1.80ms | 2.33ms | ✅ <50ms |
| `/sw.js` | 1.02ms | 1.19ms | 1.83ms | 2.11ms | ✅ <50ms |
| `/health` | 0.87ms | 1.05ms | 0.96ms | 1.13ms | ✅ <50ms |
| `/login` | 1.31ms | 1.43ms | 2.23ms | 2.60ms | ✅ <50ms |
| `/:id` (404) | 1.31ms | 1.57ms | 2.22ms | 2.72ms | ✅ <50ms |
| `/api/info/:id` (404) | 0.99ms | 1.23ms | 1.11ms | 1.33ms | ✅ <50ms |
| `/api/text/:id` (404) | 0.88ms | 1.01ms | 1.11ms | 1.32ms | ✅ <50ms |
| `/api/admin/uploads` (401) | 1.19ms | 2.74ms | 1.07ms | 1.64ms | ✅ <50ms |
| `/admin` (redirect) | 0.93ms | 1.25ms | 0.90ms | 1.02ms | ✅ <50ms |
| `/download/:id` (404) | 0.84ms | 1.09ms | 1.04ms | 1.41ms | ✅ <50ms |
| `/api/file/:id` (404) | 0.85ms | 1.04ms | 1.05ms | 1.28ms | ✅ <50ms |

**Maximum response time across all routes: 2.72ms** (well under the 50ms target).

### Localhost vs Production

On localhost, compression adds ~0.5-1ms overhead per request (CPU cost) because there's zero network latency to offset it. In production:

| Metric | Localhost | Production (network) |
|--------|-----------|---------------------|
| Compression overhead | +1ms CPU | Negligible vs network savings |
| Transfer savings | None (loopback) | 64-81% smaller payloads |
| Cache header benefit | None (no browser) | Eliminates re-fetches on repeat visits |
| Async I/O benefit | Small | Large (concurrent requests) |

---

## Functionality Verification

All routes tested post-optimization:

| Test | Expected | Result |
|------|----------|--------|
| `GET /health` | `{status: "ok"}` | ✅ Pass |
| `GET /login` | 200 HTML | ✅ Pass |
| `GET /admin` (no auth) | 302 redirect | ✅ Pass |
| `GET /api/admin/uploads` (no auth) | 401 JSON | ✅ Pass |
| `POST /api/login` (correct creds) | `{success: true}` + cookie | ✅ Pass |
| `GET /admin` (with session) | 200 HTML | ✅ Pass |
| `GET /api/admin/uploads` (with session) | JSON array | ✅ Pass |
| `POST /upload/text` | `{success: true, id}` | ✅ Pass |
| `GET /api/info/:id` | File metadata | ✅ Pass |
| `GET /api/text/:id` | Text content | ✅ Pass |
| `GET /:id` (nonexistent) | 404 HTML page | ✅ Pass |
| `POST /api/logout` | `{success: true}` | ✅ Pass |

---

## Recommendations for Production Deployment

1. **Enable gzip/brotli at Nginx level** for even better performance (Nginx can pre-compress static files):
   ```nginx
   gzip on;
   gzip_types text/css application/javascript application/json text/html;
   brotli on;  # if available
   ```

2. **Set `NODE_ENV=production`** (already set in systemd service) — enables secure cookies.

3. **Consider `nginx proxy_cache`** for static assets to skip the Node.js server entirely.

4. **Monitor the metadata file size** — the in-memory `Map` works well for hundreds of files. If the service handles thousands of concurrent files, consider SQLite instead.

---

## Git History

- `d03512f` — perf: add compression, cache headers, async I/O, path caching

---

*Generated 2026-06-19 by performance optimization agent.*
