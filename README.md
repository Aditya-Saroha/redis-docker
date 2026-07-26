# KV Store + Dashboard
A hand-built, Redis-style key-value store written in C++, paired with a Next.js web dashboard for browsing and managing keys. Packaged as a single Docker image and deployed on Render.
## What's in here
```
redis-docker/
├── redis-cpp/     # C++ TCP server: the key-value store itself
├── kvdash/        # Next.js dashboard: web UI for the store
├── dockerfile     # Combined multi-stage build → single runtime image
├── start.sh       # Runs both processes in one container; container
│                  # exits if either process dies, so the platform restarts it
└── .dockerignore
```
## Architecture
The store and the dashboard are built as two separate binaries in a multi-stage Docker build, then run as two processes inside a single container:
- **`kv-server`** — a custom C++ TCP server implementing the store's core data structures: a hash table for key lookups, an AVL tree, a heap (for TTL/expiry ordering), and a sorted-set (zset) type, backed by a thread pool for handling concurrent client connections and offloading large-object destruction off the event loop.
- **`kvdash`** — a Next.js app (App Router, standalone output) that talks to `kv-server` over `127.0.0.1` inside the same container, and exposes that access two ways: a server-rendered dashboard UI, and a REST API for external clients.

They're combined into one container — rather than run as separate services — specifically to fit within a single free-tier instance's always-on hour budget on Render.

`kv-server`'s wire protocol has no authentication of its own, and its port is never published outside the container — only `kvdash` is reachable from the internet. Auth lives entirely in the Next.js layer (see below), not the store itself.

## Dashboard

Server-rendered pages for browsing and managing the store's contents directly:

- **Key browser** (`/`) — list all keys, set new ones, delete existing ones
- **Key detail** (`/keys/:key`) — edit a value, view/set TTL with a live countdown
- **Sorted sets** (`/zsets/:key`) — view, add, and remove members of a zset

## Live stats

`kv-server` tracks its own runtime stats directly in the event loop — active connections, total connections, ops/sec (computed once per second off a rolling counter), total ops, key count, uptime, and resident memory (read from `/proc/self/statm`) — exposed via a custom `STATS` command.

The dashboard polls this once per second through an internal `/api/stats` route (not part of the public REST API — no auth required, since it's only ever called by the dashboard's own client-side JS) and renders it as a live-updating panel with a small ops/sec sparkline.

## REST API

`kvdash` also exposes the store over HTTP for external/programmatic use, under `/api/v1/*`, gated by an `x-api-key` header checked against `KV_API_KEY`. Covers get/set/delete on keys, TTL read/write, and sorted-set queries/mutations. Full endpoint reference in [`kvdash/README.md`](./kvdash/README.md).

## Running locally
Build the image from the repo root (the directory containing both `redis-cpp/` and `kvdash/`):
```bash
docker build -f dockerfile -t kvapp .
```
Run it, supplying the required environment variables:
```bash
docker run --rm --env-file .env -p 3000:3000 kvapp
```
Then open `http://localhost:3000`.
### Required environment variables
| Variable       | Description                                  |
|----------------|-----------------------------------------------|
| `KV_HOST`      | Hostname of the KV store (`127.0.0.1` in the combined container) |
| `KV_PORT`      | Port the KV store listens on                 |
| `KV_API_KEY`   | Shared secret required in the `x-api-key` header for the REST API (`/api/v1/*`) — not used by the dashboard's own store access, which is unauthenticated, trusted, same-container traffic |
Copy `.env.example` (in `kvdash/`) to `.env` and fill in real values — **never commit `.env`** with real secrets.
## Deployment
Deployed on [Render](https://render.com) as a single Docker-based Web Service:
- Dockerfile path: `dockerfile`
- Environment variables set directly in Render's dashboard (not via `.env`)