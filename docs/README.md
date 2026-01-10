# Playables Client - Developer Guide

Internal platform for Interactive Ads / UA analytics system.

## Quick Start

### 1. Start All Services
```bash
docker-compose up --build
# Wait ~30 seconds for services to be healthy

# Or use Make
make build
```

### 2. Access
- **Client UI**: http://localhost:3000
- **API**: http://localhost:8080
- **NATS Monitor**: http://localhost:8222

### 3. Stop
```bash
docker-compose down       # Stop (keep data)
docker-compose down -v    # Stop + remove data
```

---

## Project Structure

```
playables-client/
├── apps/
│   ├── api/                      # Go Backend
│   │   ├── main.go               # Entry point
│   │   └── internal/
│   │       ├── config/           # Configuration
│   │       ├── domain/           # Domain models
│   │       ├── repository/       # Data access (MySQL, ClickHouse, NATS)
│   │       ├── service/          # Business logic
│   │       ├── transport/        # HTTP handlers
│   │       └── worker/           # Async event processing
│   │
│   └── client/                   # Next.js Frontend
│       └── src/
│           ├── app/              # Pages (playables, analytics, experiments)
│           ├── components/       # React components
│           └── lib/              # API client
│
└── docker-compose.yml            # All services
```

---

## System Architecture

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
            │ - playables   │                   │ Pub/Sub
            │ - experiments │                   │
            └───────────────┘                   ▼
                                        ┌───────────────┐
                                        │ Event Worker  │
                                        │  (Batching)   │
                                        └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  ClickHouse   │
                                        │  (Port 9000)  │
                                        │ - events      │
                                        │ - analytics   │
                                        └───────────────┘
```

### Data Flow

**Event Tracking:**
1. POST /events → API validates → Publish to NATS → Return 202
2. Worker consumes → Batch (100 events or 5s) → Write to ClickHouse

**Analytics:**
1. GET /analytics/* → API queries ClickHouse → Return JSON → Display

---

## API Reference

### Endpoints

```
GET  /playables                        # List all
POST /playables                        # Create
POST /events                           # Track event (async)
GET  /analytics/summary                # Overall metrics
GET  /analytics/by-playable            # Per-playable metrics
GET  /analytics/by-experiment          # Per-experiment metrics
```

Query params: `start_date`, `end_date` (YYYY-MM-DD)

### Examples

```bash
# Health check
curl http://localhost:8080/health

# List playables
curl http://localhost:8080/playables

# Create playable
curl -X POST http://localhost:8080/playables \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Game","description":"Fun game","status":"draft"}'

# Track event
curl -X POST http://localhost:8080/events \
  -H "Content-Type: application/json" \
  -d '{"playable_id":1,"type":"impression"}'

# Get analytics
curl "http://localhost:8080/analytics/summary?start_date=2024-01-01&end_date=2026-01-31"
```

---

## Development

### Run Backend Locally

```bash
# Terminal 1: Start databases
docker-compose up mysql clickhouse nats

# Terminal 2: Run API
cd apps/api
export MYSQL_DSN="root:password@tcp(localhost:3306)/playables?parseTime=true"
export CLICKHOUSE_DSN="clickhouse://localhost:9000/analytics"
export NATS_URL="nats://localhost:4222"
go run main.go
```

### Run Frontend Locally

```bash
# Terminal 1: Ensure API is running

# Terminal 2: Run Next.js
cd apps/client
npm install
npm run dev
```

Visit http://localhost:3000

### Add New API Endpoint

1. **Domain** (`internal/domain/domain.go`) - Add model
2. **Repository** (`internal/repository/*.go`) - Add data access method
3. **Service** (`internal/service/*.go`) - Add business logic
4. **Transport** (`internal/transport/http.go`) - Add handler + route

### Add New Frontend Page

1. **Create page** (`src/app/newpage/page.tsx`)
2. **Add to nav** (`src/components/Navigation.tsx`)
3. **Add API method** (`src/lib/api.ts`)
4. **Use React Query** for data fetching

---

## Common Commands

```bash
# Docker
make build          # Build and start
make up             # Start services
make down           # Stop services
make logs           # View all logs
make logs-api       # View API logs
make logs-client    # View client logs
make clean          # Remove everything
make reset          # Clean + rebuild
make status         # Service status

# Local dev
make dev-api        # Run API locally
make dev-client     # Run client locally
```

---

## Database Schemas

### MySQL (Configuration)

**playables**
```sql
id            BIGINT (PK)
name          VARCHAR(255)
description   TEXT
status        VARCHAR(50)    -- draft, active, archived
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

**experiments**
```sql
id            BIGINT (PK)
name          VARCHAR(255)
description   TEXT
status        VARCHAR(50)
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

### ClickHouse (Analytics)

**events**
```sql
id              String           -- UUID
playable_id     Int64
experiment_id   Nullable(Int64)
type            String           -- impression, click, install
timestamp       DateTime
metadata        String           -- JSON
date            Date             -- Partition key (monthly)
```

---

## Troubleshooting

### Services not starting
```bash
# Check port conflicts
lsof -i :3000 :8080 :3306 :9000 :4222

# View logs
docker-compose logs <service>

# Restart service
docker-compose restart <service>
```

### Database connection issues
```bash
# Check health
docker-compose ps

# Restart databases
docker-compose restart mysql clickhouse
```

### Frontend can't reach API
```bash
# Check API health
curl http://localhost:8080/health
```

---

## Tech Stack

- **Backend**: Go 1.21, Gorilla Mux
- **Frontend**: Next.js 14, React 18, TypeScript, React Query, Recharts
- **Databases**: MySQL 8.0, ClickHouse 23.8
- **Messaging**: NATS 2.10
- **Infra**: Docker Compose

---

## Architecture Notes

### Clean Architecture (Backend)
- **Transport** - HTTP handlers, no business logic
- **Service** - Business logic, validation
- **Repository** - Data access only
- **Domain** - Pure models

### Async Processing
- Events published to NATS
- Worker batches: 100 events OR 5 seconds
- Writes batches to ClickHouse
- Better throughput, eventual consistency

### Frontend Patterns
- App Router (Next.js 14)
- React Query for data fetching
- Client Components for interactivity
- Type-safe API client

---

## What's NOT Included (Intentional)

- ❌ Authentication - Internal tool prototype
- ❌ Tests - Prototype scope
- ❌ Monitoring - Basic logging only
- ❌ Rate limiting
- ❌ CI/CD
