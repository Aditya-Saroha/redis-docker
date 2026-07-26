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

- **`kv-server`** — a custom C++ TCP server implementing the store's core data structures: a hash table for key lookups, an AVL tree, a heap (for TTL/expiry ordering), and a sorted-set (zset) type, backed by a thread pool for handling concurrent client connections.
- **`kvdash`** — a Next.js app (App Router, standalone output) that talks to `kv-server` over `127.0.0.1` inside the same container and renders a UI for viewing, setting, and deleting keys.

They're combined into one container — rather than run as separate services — specifically to fit within a single free-tier instance's always-on hour budget on Render.

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
| `KV_API_KEY`   | Auth key the dashboard uses to talk to the store |

Copy `.env.example` (in `kvdash/`) to `.env` and fill in real values — **never commit `.env`** with real secrets.

## Deployment

Deployed on [Render](https://render.com) as a single Docker-based Web Service:
- Dockerfile path: `dockerfile`
- Environment variables set directly in Render's dashboard (not via `.env`)
- Free tier: services spin down after inactivity, so the first request after idle time will be slow (cold start)

## Notes on the C++ server

- Custom hash table, AVL tree, binary heap, and sorted-set implementations from scratch — no STL containers used for the core store logic
- Thread pool for handling concurrent client connections