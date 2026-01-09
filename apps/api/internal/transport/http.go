package transport

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"playables-api/internal/domain"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

type HTTPHandler struct {
	playableService  PlayableService
	eventService     EventService
	analyticsService AnalyticsService
}

type PlayableService interface {
	CreatePlayable(ctx context.Context, playable *domain.Playable) error
	ListPlayables(ctx context.Context) ([]domain.Playable, error)
	GetPlayable(ctx context.Context, id int64) (*domain.Playable, error)
}

type EventService interface {
	TrackEvent(ctx context.Context, event *domain.Event) error
}

type AnalyticsService interface {
	GetSummary(ctx context.Context, startDate, endDate time.Time) (*domain.AnalyticsSummary, error)
	GetAnalyticsByPlayable(ctx context.Context, startDate, endDate time.Time) ([]domain.PlayableAnalytics, error)
	GetAnalyticsByExperiment(ctx context.Context, startDate, endDate time.Time) ([]domain.ExperimentAnalytics, error)
	GetTimeSeriesByPlayable(ctx context.Context, playableID int64, startDate, endDate time.Time) ([]domain.TimeSeriesData, error)
	GetTimeSeriesAllPlayables(ctx context.Context, startDate, endDate time.Time) ([]domain.PlayableTimeSeriesAnalytics, error)
}

func NewHTTPHandler(
	playableService PlayableService,
	eventService EventService,
	analyticsService AnalyticsService,
) *HTTPHandler {
	return &HTTPHandler{
		playableService:  playableService,
		eventService:     eventService,
		analyticsService: analyticsService,
	}
}

func NewRouter(h *HTTPHandler) *mux.Router {
	r := mux.NewRouter()

	// CORS middleware
	r.Use(corsMiddleware)
	r.Use(loggingMiddleware)

	// Health check
	r.HandleFunc("/health", h.HealthCheck).Methods("GET", "OPTIONS")

	// Playables
	r.HandleFunc("/playables", h.ListPlayables).Methods("GET", "OPTIONS")
	r.HandleFunc("/playables", h.CreatePlayable).Methods("POST", "OPTIONS")

	// Events
	r.HandleFunc("/events", h.TrackEvent).Methods("POST", "OPTIONS")

	// Analytics
	r.HandleFunc("/analytics/summary", h.GetAnalyticsSummary).Methods("GET", "OPTIONS")
	r.HandleFunc("/analytics/by-playable", h.GetAnalyticsByPlayable).Methods("GET", "OPTIONS")
	r.HandleFunc("/analytics/by-experiment", h.GetAnalyticsByExperiment).Methods("GET", "OPTIONS")
	r.HandleFunc("/analytics/timeseries", h.GetTimeSeriesAllPlayables).Methods("GET", "OPTIONS")
	r.HandleFunc("/analytics/timeseries/{playable_id}", h.GetTimeSeriesByPlayable).Methods("GET", "OPTIONS")

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.RequestURI, time.Since(start))
	})
}

func (h *HTTPHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *HTTPHandler) ListPlayables(w http.ResponseWriter, r *http.Request) {
	playables, err := h.playableService.ListPlayables(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, playables)
}

func (h *HTTPHandler) CreatePlayable(w http.ResponseWriter, r *http.Request) {
	var playable domain.Playable
	if err := json.NewDecoder(r.Body).Decode(&playable); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.playableService.CreatePlayable(r.Context(), &playable); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, playable)
}

func (h *HTTPHandler) TrackEvent(w http.ResponseWriter, r *http.Request) {
	var event domain.Event
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.eventService.TrackEvent(r.Context(), &event); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func (h *HTTPHandler) GetAnalyticsSummary(w http.ResponseWriter, r *http.Request) {
	startDate, endDate := parseDateRange(r)

	summary, err := h.analyticsService.GetSummary(r.Context(), startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, summary)
}

func (h *HTTPHandler) GetAnalyticsByPlayable(w http.ResponseWriter, r *http.Request) {
	startDate, endDate := parseDateRange(r)

	analytics, err := h.analyticsService.GetAnalyticsByPlayable(r.Context(), startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, analytics)
}

func (h *HTTPHandler) GetAnalyticsByExperiment(w http.ResponseWriter, r *http.Request) {
	startDate, endDate := parseDateRange(r)

	analytics, err := h.analyticsService.GetAnalyticsByExperiment(r.Context(), startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, analytics)
}

func parseDateRange(r *http.Request) (time.Time, time.Time) {
	// Default to last 7 days
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -7)

	if start := r.URL.Query().Get("start_date"); start != "" {
		if t, err := time.Parse("2006-01-02", start); err == nil {
			startDate = t
		}
	}

	if end := r.URL.Query().Get("end_date"); end != "" {
		if t, err := time.Parse("2006-01-02", end); err == nil {
			endDate = t
		}
	}

	return startDate, endDate
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func (h *HTTPHandler) GetTimeSeriesAllPlayables(w http.ResponseWriter, r *http.Request) {
	startDate, endDate := parseDateRange(r)

	analytics, err := h.analyticsService.GetTimeSeriesAllPlayables(r.Context(), startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, analytics)
}

func (h *HTTPHandler) GetTimeSeriesByPlayable(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	playableIDStr := vars["playable_id"]
	
	playableID, err := strconv.ParseInt(playableIDStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid playable_id")
		return
	}

	startDate, endDate := parseDateRange(r)

	timeSeries, err := h.analyticsService.GetTimeSeriesByPlayable(r.Context(), playableID, startDate, endDate)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, timeSeries)
}
