# System Architecture

## Overview Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────┐        ┌──────────────┐
│  Next.js Client │◄──────►│   Go API     │
│   (Port 3000)   │  REST  │ (Port 8080)  │
└─────────────────┘        └───┬──────┬───┘
                               │      │
                    ┌──────────┘      └──────────┐
                    │                            │
                    ▼                            ▼
            ┌───────────────┐          ┌─────────────────┐
            │     MySQL     │          │      NATS       │
            │  (Port 3306)  │          │   (Port 4222)   │
            │               │          └────────┬────────┘
            │ - playables   │                   │
            │ - experiments │                   │ Pub/Sub
            └───────────────┘                   │
                                                ▼
                                        ┌───────────────┐
                                        │ Event Worker  │
                                        │   (Batching)  │
                                        └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  ClickHouse   │
                                        │  (Port 9000)  │
                                        │               │
                                        │ - events      │
                                        │ - analytics   │
                                        └───────────────┘
```

## Project Structure

```
playables-client/
├── apps/
│   ├── api/                          # Go Backend
│   │   ├── main.go                   # Entry point
│   │   ├── internal/
│   │   │   ├── config/               # Configuration
│   │   │   ├── domain/               # Domain models
│   │   │   ├── repository/           # Data access
│   │   │   │   ├── mysql.go          # MySQL client
│   │   │   │   ├── clickhouse.go     # ClickHouse client
│   │   │   │   └── nats.go           # NATS client
│   │   │   ├── service/              # Business logic
│   │   │   │   ├── playable.go       # Playable CRUD
│   │   │   │   ├── event.go          # Event validation
│   │   │   │   └── analytics.go      # Analytics queries
│   │   │   ├── transport/            # HTTP layer
│   │   │   │   ├── http.go           # Handlers + routes
│   │   │   │   └── context.go        # Context helpers
│   │   │   └── worker/               # Async processing
│   │   │       └── event_worker.go   # Event consumer
│   │   ├── scripts/
│   │   │   ├── init-mysql.sql        # MySQL schema + data
│   │   │   └── init-clickhouse.sql   # ClickHouse schema + data
│   │   ├── go.mod
│   │   └── Dockerfile
│   │
│   └── client/                       # Next.js Frontend
│       ├── src/
│       │   ├── app/                  # Pages (App Router)
│       │   │   ├── layout.tsx        # Root layout
│       │   │   ├── page.tsx          # Home page
│       │   │   ├── providers.tsx     # React Query setup
│       │   │   ├── globals.css       # Global styles
│       │   │   ├── playables/
│       │   │   │   └── page.tsx      # Playables management
│       │   │   ├── analytics/
│       │   │   │   └── page.tsx      # Analytics dashboard
│       │   │   └── experiments/
│       │   │       └── page.tsx      # Experiment results
│       │   ├── components/
│       │   │   └── Navigation.tsx    # Site navigation
│       │   └── lib/
│       │       └── api.ts            # Type-safe API client
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── docker-compose.yml                # All services
├── Makefile                          # Common commands
└── README.md                         # Main docs
```

## Backend Layers

```
┌─────────────────────────────────────────┐
│          Transport Layer                │
│  (HTTP handlers, routing, middleware)   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Service Layer                  │
│  (Business logic, validation)           │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Repository Layer                │
│  (MySQL, ClickHouse, NATS access)       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Domain Layer                   │
│  (Pure models, no dependencies)         │
└─────────────────────────────────────────┘
```

## Data Flow

### Event Tracking
```
Client
  │
  ├─► POST /events
  │
API
  ├─► Validate event
  ├─► Publish to NATS
  └─► Return 202 Accepted
  
NATS
  │
  └─► Event queue

Worker
  ├─► Consume from NATS
  ├─► Buffer events (100 or 5s)
  └─► Batch write to ClickHouse

ClickHouse
  └─► Store events
```

### Analytics Query
```
Client
  │
  ├─► GET /analytics/*
  │
API
  ├─► Query ClickHouse
  └─► Return aggregated JSON

ClickHouse
  └─► Aggregate data
```

## Database Schemas

### MySQL (Configuration)

**playables**
```
┌──────────────┬──────────────┬─────────┐
│ Column       │ Type         │ Key     │
├──────────────┼──────────────┼─────────┤
│ id           │ BIGINT       │ PK      │
│ name         │ VARCHAR(255) │         │
│ description  │ TEXT         │         │
│ status       │ VARCHAR(50)  │ INDEX   │
│ created_at   │ TIMESTAMP    │ INDEX   │
│ updated_at   │ TIMESTAMP    │         │
└──────────────┴──────────────┴─────────┘
```

**experiments**
```
┌──────────────┬──────────────┬─────────┐
│ Column       │ Type         │ Key     │
├──────────────┼──────────────┼─────────┤
│ id           │ BIGINT       │ PK      │
│ name         │ VARCHAR(255) │         │
│ description  │ TEXT         │         │
│ status       │ VARCHAR(50)  │ INDEX   │
│ created_at   │ TIMESTAMP    │ INDEX   │
│ updated_at   │ TIMESTAMP    │         │
└──────────────┴──────────────┴─────────┘
```

### ClickHouse (Analytics)

**events**
```
┌───────────────┬─────────────────┬──────────────────────┐
│ Column        │ Type            │ Notes                │
├───────────────┼─────────────────┼──────────────────────┤
│ id            │ String          │ UUID                 │
│ playable_id   │ Int64           │                      │
│ experiment_id │ Nullable(Int64) │                      │
│ type          │ String          │ impression/click/... │
│ timestamp     │ DateTime        │                      │
│ metadata      │ String          │ JSON                 │
│ date          │ Date            │ Partition key        │
└───────────────┴─────────────────┴──────────────────────┘

Partitioning: Monthly (toYYYYMM(date))
Order by: (playable_id, type, timestamp)
```

## API Endpoints

```
Playables
  GET  /playables              → List all
  POST /playables              → Create

Events
  POST /events                 → Track (async)

Analytics
  GET /analytics/summary              → Overall metrics
  GET /analytics/by-playable          → Per-playable
  GET /analytics/by-experiment        → Per-experiment
  
Query params: start_date, end_date (YYYY-MM-DD)
```

## Frontend Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout + nav
│   ├── providers.tsx       # React Query
│   ├── page.tsx            # Home
│   ├── playables/          # Playable management
│   ├── analytics/          # Dashboard + charts
│   └── experiments/        # A/B test results
│
├── components/             # Reusable components
│   └── Navigation.tsx
│
└── lib/                    # Utilities
    └── api.ts              # Type-safe API client
```
