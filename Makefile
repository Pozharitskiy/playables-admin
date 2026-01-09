.PHONY: help up down logs build clean reset

help: 
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Start all services
	docker-compose up -d

build: ## Build and start all services
	docker-compose up --build -d

down: ## Stop all services
	docker-compose down

logs: ## Show logs for all services
	docker-compose logs -f

logs-api: ## Show API logs
	docker-compose logs -f api

logs-admin: ## Show admin logs
	docker-compose logs -f admin

clean: ## Remove containers and volumes
	docker-compose down -v

reset: clean build ## Reset everything and rebuild
	@echo "Environment reset complete"

dev-api: ## Run API locally
	cd apps/api && go run main.go

dev-admin: ## Run admin UI locally
	cd apps/admin && npm run dev

test-api: ## Run API tests
	cd apps/api && go test ./...

status: ## Show service status
	docker-compose ps
