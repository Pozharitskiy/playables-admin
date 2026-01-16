.PHONY: help up down build dev dev-down logs logs-api clean reset status

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Production mode
up: ## Start all services
	docker-compose up -d

build: ## Build and start all services
	docker-compose up --build -d

down: ## Stop all services
	docker-compose down

# Development mode
dev: ## Start backend services in Docker
	docker-compose -f docker-compose.dev.yml up --build -d
	@echo ""
	@echo "✅ Backend services started!"
	@echo "📦 MySQL:      localhost:3306"
	@echo "📦 ClickHouse: localhost:9000"
	@echo "📦 NATS:       localhost:4222"
	@echo "🚀 API:        localhost:8080"
	@echo ""
	@echo "💡 Now run client: cd apps/client && npm run dev"
	@echo ""

dev-down: ## Stop development services
	docker-compose -f docker-compose.dev.yml down

# Logs
logs: ## Show logs for all services
	docker-compose -f docker-compose.dev.yml logs -f

logs-api: ## Show API logs
	docker-compose -f docker-compose.dev.yml logs -f api

# Maintenance
clean: ## Remove containers and volumes
	docker-compose -f docker-compose.dev.yml down -v

reset: clean dev ## Reset everything and rebuild
	@echo "✅ Environment reset complete"

status: ## Show service status
	docker-compose -f docker-compose.dev.yml ps
