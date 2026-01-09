package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"playables-api/internal/config"
	"playables-api/internal/repository"
	"playables-api/internal/service"
	"playables-api/internal/transport"
	"playables-api/internal/worker"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize repositories
	mysqlRepo, err := repository.NewMySQLRepository(cfg.MySQLDSN)
	if err != nil {
		log.Fatalf("Failed to connect to MySQL: %v", err)
	}
	defer mysqlRepo.Close()

	clickhouseRepo, err := repository.NewClickHouseRepository(cfg.ClickHouseDSN)
	if err != nil {
		log.Fatalf("Failed to connect to ClickHouse: %v", err)
	}
	defer clickhouseRepo.Close()

	natsClient, err := repository.NewNATSClient(cfg.NATSURL)
	if err != nil {
		log.Fatalf("Failed to connect to NATS: %v", err)
	}
	defer natsClient.Close()

	// Initialize services
	playableService := service.NewPlayableService(mysqlRepo)
	eventService := service.NewEventService(natsClient, mysqlRepo)
	analyticsService := service.NewAnalyticsService(clickhouseRepo, mysqlRepo)

	// Start event worker
	eventWorker := worker.NewEventWorker(natsClient, clickhouseRepo)
	go eventWorker.Start()

	// Initialize HTTP transport
	handler := transport.NewHTTPHandler(playableService, eventService, analyticsService)
	router := transport.NewRouter(handler)

	// Create HTTP server
	srv := &http.Server{
		Addr:         cfg.ServerAddr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on %s", cfg.ServerAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server stopped")
}
