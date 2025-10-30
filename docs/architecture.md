# Architecture Overview

## High-Level Diagram (Textual)

```
				+---------------------------+
				|  External Job Feeds (XML) |
				+-------------+-------------+
								  |
						  (1) Fetch & Parse (cron hourly / manual)
								  |
						  +-----v------+
						  | ImportRun  |  (ImportLog created: runId)
						  +-----+------+
								  |
						(2) Map Raw Items
								  |
						(3) Batch Enqueue (BullMQ)
								  |
		  +-----------------v------------------+
		  | Redis (Queue: jobImport)           |
		  +-----------------+------------------+
								  |
						  (4) Workers (N=concurrency)
								  |
					  +--------v---------+
					  | MongoDB (Jobs)   |
					  +--------+---------+
								  |
						  (5) Update ImportLog counters
								  |
						  (6) SSE Broadcast Events
								  |
							+----v----+
							| Client  |
							+---------+
```

## Components

1. Feed Fetcher Service (`services/feeds.ts`)
	* Pulls XML from configured feed URLs (list constant, can be externalized).
	* Converts XML -> JSON via `xml2js`.
	* Maps each <item> entry to normalized `RawJobItem`.
	* Creates an `ImportLog` at start; increments totals & failure records.
	* Batches items (IMPORT_BATCH_SIZE) and enqueues each job individually (fine-grained retry control).

2. Queue Layer (BullMQ + Redis)
	* Queue name: `jobImport`.
	* Each job payload holds `runId`, `sourceUrl`, and normalized job data.
	* Concurrency configurable via `QUEUE_CONCURRENCY`.
	* (Future) Can apply per-job retry/backoff policy; currently default.

3. Worker (`worker/jobWorker.ts`)
	* Consumes import tasks; upserts job by compound key `(externalId, sourceUrl)`.
	* Determines if insert vs update by using `updateOne(..., { upsert: true })` result's `upsertedCount`.
	* Updates ImportLog counters atomically with `$inc`.
	* Adds failure entries with reason on error.
	* Broadcasts SSE events for UI real-time refresh.

4. Persistence (MongoDB via Mongoose)
	* `Job` collection: core job fields + original raw item.
	* Unique compound index ensures idempotence & concurrency safety.
	* `ImportLog` collection: run-level metrics; optionally could add finish detection logic.

5. API (Express)
	* `/api/imports/run` triggers manual import (immediate feed ingestion + queueing).
	* `/api/imports/logs` paginated listing (simplified limit param) for UI.
	* `/api/jobs` sample endpoint for verification / future UI use.
	* Error middleware returns standardized JSON shape.

6. Real-Time Channel (Server-Sent Events)
	* Endpoint `/events` keeps lightweight always-on stream.
	* Broadcast events: `job` (with wasNew flag), `importRunStarted`.
	* Chosen over WebSockets for simpler one-way updates & no handshake complexity.

7. Client (Next.js)
	* Displays recent import runs & live event list.
	* Manual import trigger button.
	* Uses SWR for incremental revalidation + SSE for push updates.

## Data Models

### Job
```
externalId: string (from feed guid/link)
sourceUrl: string (feed url)  UNIQUE together with externalId
title, description, company, location, categories[], employmentType, publishDate
raw: full original item
timestamps
```

### ImportLog
```
runId: uuid
sourceUrls[]
startedAt, finishedAt
totalFetched (raw items discovered)
totalImported (items enqueued)  -- could diverge if filtering applied
newJobs, updatedJobs, failedJobs
failures: [{ externalId, reason, at }]
```

## Concurrency & Throughput

* Worker concurrency controls parallel write pressure on Mongo.
* Batching at enqueue time reduces per-feed roundtrips (network vs queue overhead trade-off).
* Could extend with a feed-level queue to isolate problematic feeds.
* Scaling horizontally: multiple identical worker processes can attach to Redis queue (stateless design).

## Failure Handling

| Failure Type | Handling | Future Enhancements |
|--------------|----------|---------------------|
| Feed fetch timeout | Logged; ImportLog failure increments | Circuit breaker / exponential backoff |
| XML parse error | Counted as failure for the feed | Alerting & feed disable flag |
| Validation / DB error | Job failure recorded with reason | Retry with capped attempts, dead-letter queue |
| Worker crash | BullMQ reclaims unacked jobs | Health probes & autoscaling |

## Idempotence

* Upsert ensures multiple enqueue attempts don't duplicate jobs.
* Unique index guards race conditions.
* `runId` scoping keeps metrics per import batch distinct.

## Observability / Logging

* `pino` structured logs; log level configurable.
* Could add: metrics (Prometheus), trace (OpenTelemetry), health endpoints.

## Security Considerations

* Current prototype unauthenticated. For production:
  * Add auth (JWT / basic auth or behind VPN).
  * Input validation (limit feed list to allowlist config).
  * Rate limiting for manual trigger endpoint.

## Extensibility

* Additional feeds: simply append to `FEED_URLS` or externalize to DB / env.
* Additional job attributes: extend mapper & Job schema; existing workers unaffected.
* Alternate UI channels: WebSocket gateway or GraphQL subscriptions.
* Microservice split: separate ingestion (feed fetch) from processing (workers) & API (read layer) with shared Redis/Mongo.

## Finish Detection

Current approach: periodic cleanup sets `finishedAt` for very old runs. For precise finish times:
1. Track `pendingJobs` count inside ImportLog (increment on enqueue, decrement on completion/failure) via atomic ops.
2. When pending hits zero, set `finishedAt`.

## Retry & Backoff (Future)

BullMQ allows per-job `attempts`, `backoff`. Could classify errors:
* Network/transient -> retry with exponential backoff.
* Validation (e.g., missing required fields) -> no retry, immediate fail.
Add an error classifier inside worker to set `throw` vs mark as permanent.

## Configuration Summary

Environment-driven, enabling containerization & Twelve-Factor compliance.

## Deployment Considerations

* Containerization: multi-stage Dockerfiles for server & client; docker-compose with services (mongo, redis, server, client, optional worker separate).
* Horizontal scaling: scale worker replicas; ensure unique consumer logic requires no shared state.
* Use Redis persistence / clustering for resilience; Mongo replicaset for HA.

## Trade-offs

* SSE vs WebSockets: simpler, but one-way and less flexible; acceptable for admin monitoring.
* Per-item queue jobs vs batch jobs: higher overhead but granular metrics and retries.
* Upsert per item: simple logic; if write amplification high, consider diff detection before update.

## Potential Optimizations

* Deduplicate feed items before enqueue (hashing) if feeds overlap significantly.
* Partition queues by feed to isolate slow/problematic sources.
* Add caching layer for unchanged items (etag/lastModified; requires feed server support).

---
This document will evolve alongside further enhancements (auth, metrics, finish detection, retries).
