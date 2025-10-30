# Joblish

Scalable Job Importer with Queue Processing & History Tracking.

## Structure

- `client/` Next.js admin UI (SSE real-time updates, manual import trigger)
- `server/` Node.js (Express) + BullMQ + MongoDB (Mongoose) + Redis
- `docs/architecture.md` System design & decisions

## Features

* Hourly cron fetch of multiple XML job feeds -> XML to JSON parsing.
* Batched enqueue of individual job import tasks (BullMQ, Redis backed).
* Worker upserts jobs; tracks new vs updated vs failed.
* Import run logging stored in `import_logs` collection (with per-run metrics & failures).
* Real-time Server-Sent Events broadcasting job processed / failed events and run starts.
* Configurable concurrency & batch size via environment variables.

## Prerequisites

* Node.js 18+
* MongoDB
* Redis

## Server Setup

1. Copy env file:
	```powershell
	cd server
	Copy-Item .env.example .env
	```
2. (Optional) adjust values (Mongo/Redis hosts, concurrency, batch size).
3. Install deps & run dev:
	```powershell
	npm install
	npm run dev
	```
4. The API listens on `http://localhost:4000`.

### Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/imports/run` | Trigger a manual import run |
| GET | `/api/imports/logs?limit=25` | List recent import runs |
| GET | `/api/jobs?limit=50` | List recent jobs |
| GET | `/events` | SSE stream (events: `job`, `importRunStarted`) |

## Client Setup

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:3000`.

Set `NEXT_PUBLIC_API_BASE` if server not on default.

## Running Tests (Server)

```powershell
cd server
npm test
```

## Configuration

Environment variables (server):

| Name | Default | Purpose |
|------|---------|---------|
| PORT | 4000 | API port |
| MONGO_URI | mongodb://localhost:27017/joblish | Mongo connection |
| REDIS_HOST | 127.0.0.1 | Redis host |
| REDIS_PORT | 6379 | Redis port |
| QUEUE_CONCURRENCY | 5 | Worker concurrency |
| IMPORT_BATCH_SIZE | 50 | Batch size for enqueuing |
| LOG_LEVEL | info | Pino log level |
| ENABLE_SSE | true | Toggle SSE endpoint |

## High-Level Flow

1. Cron (hourly) calls `runImport()`.
2. Each feed fetched -> XML parsed -> items mapped to RawJobItem.
3. Items batched & enqueued in Redis queue.
4. Worker consumes tasks; upserts job documents.
5. ImportLog increments counters for new / updated / failed.
6. SSE events broadcast to client UI in real time.

See `docs/architecture.md` for deeper design & scaling notes.

## Next Steps / Improvements

* Add graceful shutdown & drain of workers.
* Add run finalization (mark finishedAt when queue empty) via queue events.
* Add authentication for admin UI.
* Pagination & filtering for logs and jobs.
* Retry & backoff policies per error class (already supported by BullMQ config overrides).
* Observability: metrics endpoint & structured tracing.

## License

MIT (add appropriate LICENSE file if required).

## Using Existing Podman Containers

If you already launched Mongo & Redis via Podman (e.g.):

```powershell
podman run -d --name mongo --network mongo-net -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=pass mongo:latest
podman run -d --name redis -p 6379:6379 redis:latest
podman run -d --name mongo-express --network mongo-net -p 8081:8081 -e ME_CONFIG_MONGODB_URL="mongodb://root:pass@mongo:27017/" -e ME_CONFIG_BASICAUTH_USERNAME=admin -e ME_CONFIG_BASICAUTH_PASSWORD=adminpass mongo-express:latest
```

Then set in `server/.env`:
```env
MONGO_URI=mongodb://root:pass@localhost:27017/joblish?authSource=admin
REDIS_HOST=localhost
REDIS_PORT=6379
```

Run server & client normally. `mongo-express` will be reachable at http://localhost:8081 for UI inspection.

Inside Docker Compose containers (if you use compose for app only) you may need:
```env
MONGO_URI=mongodb://root:pass@host.docker.internal:27017/joblish?authSource=admin
REDIS_HOST=host.docker.internal
```
For Podman, if `host.docker.internal` does not resolve, use `host.containers.internal`.


