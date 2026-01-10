# Playables Admin Platform

Internal platform for Interactive Ads / UA analytics system.

## Overview

This is a client application and backend API for managing playable ads and analyzing their performance metrics. It demonstrates:
- Full-stack development (Go backend + Next.js frontend)
- Clean architecture patterns
- Async event processing
- Data-heavy client UI

**It's the platform that manages playables.**

## Tech Stack

### Backend
- **Language**: Go 1.21
- **API**: REST (JSON)
- **Architecture**: Clean layering (transport → service → repository)
- **Databases**: 
  - MySQL (configuration & metadata)
  - ClickHouse (analytics & events)
- **Messaging**: NATS (async event processing)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Data Fetching**: React Query
- **Charts**: Recharts
- **Style**: Simple CSS

## Architecture

```
apps/
├── api/          # Go backend
│   ├── main.go
│   ├── internal/
│   │   ├── config/      # Configuration
│   │   ├── domain/      # Domain models
│   │   ├── repository/  # Data access (MySQL, ClickHouse, NATS)
│   │   ├── service/     # Business logic
│   │   ├── transport/   # HTTP handlers
│   │   └── worker/      # Async event processing
│   └── scripts/         # Database init scripts
│
└── client/       # Next.js frontend
    └── src/
        ├── app/         # Pages (playables, analytics, experiments)
        ├── components/  # Reusable components
        └── lib/         # API client
```

## Domain Model

### Entities
- **Playable**: Interactive ad creative
- **Event**: Tracking event (impression, click, install)
- **Experiment**: A/B test configuration

### Event Flow
1. Events are posted to `/events` endpoint
2. Events are validated and published to NATS
3. Worker consumes events and batches them
4. Worker writes batches to ClickHouse
5. Analytics queries read from ClickHouse

## API Endpoints

### Playables
- `GET /playables` - List all playables
- `POST /playables` - Create a new playable

### Events
- `POST /events` - Track an event (async processing)

### Analytics
- `GET /analytics/summary` - Overall metrics summary
- `GET /analytics/by-playable` - Metrics grouped by playable
- `GET /analytics/by-experiment` - Metrics grouped by experiment

Query parameters: `start_date`, `end_date` (format: YYYY-MM-DD)

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Go 1.21+ (for local development)
- Node.js 18+ (for local development)

### Quick Start (Production Mode)

Run everything in Docker:

```bash
# Start all services
docker-compose up --build

# Or using Makefile
make build
```

**Access:**
- Client UI: http://localhost:3000
   - API: http://localhost:8080
   - NATS Monitoring: http://localhost:8222

3. **Stop services:**
   ```bash
   docker-compose down
   ```

### Local Development (Recommended)

**Best approach**: Run backend in Docker, frontend locally with hot reload.

#### 1️⃣ Start Backend Services (in Docker)

```bash
# Option A: Using Makefile (recommended)
make dev

# Option B: Using docker-compose directly
docker-compose -f docker-compose.dev.yml up --build
```

This starts:
- ✅ MySQL (port 3306)
- ✅ ClickHouse (port 9000)
- ✅ NATS (port 4222)
- ✅ API (port 8080)

#### 2️⃣ Run Frontend (with hot reload)

In a **separate terminal**:

```bash
cd apps/client
npm install  # first time only
npm run dev
```

**Access:**
- 🎨 Frontend: http://localhost:3000 (hot reload enabled!)
- 🚀 API: http://localhost:8080

#### 🔄 Making Changes

- **Frontend changes**: Saved automatically, hot reload in browser
- **Backend changes**: Requires rebuild:
  ```bash
  make dev  # or docker-compose -f docker-compose.dev.yml up --build
  ```

#### 🛑 Stop Services

```bash
# Stop backend
make dev-down

# Or
docker-compose -f docker-compose.dev.yml down

# Frontend stops with Ctrl+C
```

---

### Alternative: Fully Local Development

If you want to run everything outside Docker:

#### Backend (API)
```bash
cd apps/api

# Install dependencies
go mod download

# Set environment variables
export MYSQL_DSN="root:password@tcp(localhost:3306)/playables?parseTime=true"
export CLICKHOUSE_DSN="clickhouse://localhost:9000/analytics"
export NATS_URL="nats://localhost:4222"

# Run (requires databases running)
go run main.go
```

#### Frontend (Client)
```bash
cd apps/client
npm install
npm run dev
```

**Note**: You still need MySQL, ClickHouse, and NATS running (can use docker-compose for just databases).

## Sample Data

The system includes sample data:
- 3 playables (Puzzle Adventure, Racing Fury, Tower Defense Pro)
- 2 experiments (Color Scheme A/B Test, CTA Button Test)
- Sample events for testing analytics

## Design Decisions

### Backend Choices

**Why Go?**
- Fast, compiled, great for APIs
- Strong standard library
- Clean concurrency model (goroutines for worker)

**Why Clean Architecture?**
- Business logic is independent of frameworks
- Easy to test
- Clear separation of concerns

**Why NATS?**
- Lightweight message broker
- Perfect for async event processing
- Simple pub/sub pattern

**Why ClickHouse?**
- Columnar database optimized for analytics
- Fast aggregations on large datasets
- Append-only events fit the model

### Frontend Choices

**Why Next.js?**
- Fast setup for client applications
- Server Components for data-heavy pages
- Built-in routing

**Why React Query?**
- Handles caching, refetching, loading states
- Clean API for data fetching
- Optimistic updates

**Why simple CSS?**
- This is an internal tool
- Focus on clarity over aesthetics
- Fast to build and maintain

## Non-Goals

- ❌ Authentication/Authorization (internal tool)
- ❌ Real ad network integrations
- ❌ Advanced visualization
- ❌ Over-engineering

## Future Enhancements

If this were a real project:
- Add authentication (e.g., OAuth2)
- Implement role-based permissions
- Add real-time dashboards (WebSocket)
- Integrate with ad networks
- Add export functionality (CSV, PDF)
- Implement experiment configuration UI
- Add more sophisticated charts

## Testing

### Backend
```bash
cd apps/api
go test ./...
```

### Frontend
```bash
cd apps/client
npm test
```

## Troubleshooting

### Database connection issues
- Ensure MySQL and ClickHouse are healthy: `docker-compose ps`
- Check logs: `docker-compose logs mysql` or `docker-compose logs clickhouse`

### NATS connection issues
- Verify NATS is running: `docker-compose logs nats`
- Check monitoring page: http://localhost:8222

### Frontend not showing data
- Verify API is accessible: `curl http://localhost:8080/health`
- Check browser console for errors
- Verify `NEXT_PUBLIC_API_URL` environment variable

## Project Structure Philosophy

This project demonstrates "internal company code" style:
- Clear over clever
- Simple over sophisticated
- Maintainable over optimal

The goal is a realistic prototype that shows full-stack thinking, not production-ready software.
