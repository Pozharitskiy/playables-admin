.PHONY: help up down logs build clean reset dev dev-backend dev-frontend dev-client

help: 
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Production mode (all in Docker)
up: ## Start all services
	docker-compose up -d

build: ## Build and start all services
	docker-compose up --build -d

down: ## Stop all services
	docker-compose down

# Development mode (backend in Docker, frontend local)
dev: ## Start backend in Docker (use with npm run dev for frontend)
	docker-compose -f docker-compose.dev.yml up --build -d
	@echo ""
	@echo "✅ Backend services started!"
	@echo "📦 MySQL:      localhost:3306"
	@echo "📦 ClickHouse: localhost:9000"
	@echo "📦 NATS:       localhost:4222"
	@echo "🚀 API:        localhost:8080"
	@echo ""
	@echo "💡 Now run client:"
	@echo "   cd apps/client && npm run dev"
	@echo ""

dev-backend: ## Same as dev (start backend services only)
	@make dev

dev-frontend: ## Run frontend with hot reload
	cd apps/client && npm run dev

dev-down: ## Stop development services
	docker-compose -f docker-compose.dev.yml down

logs: ## Show logs for all services
	docker-compose logs -f

logs-api: ## Show API logs
	docker-compose logs -f api

logs-client: ## Show client logs
	docker-compose logs -f client

clean: ## Remove containers and volumes
	docker-compose down -v

reset: clean build ## Reset everything and rebuild
	@echo "Environment reset complete"

dev-api: ## Run API locally
	cd apps/api && go run main.go

dev-client: ## Run client locally
	cd apps/client && npm run dev

test-api: ## Run API tests
	cd apps/api && go test ./...

status: ## Show service status
	docker-compose ps
