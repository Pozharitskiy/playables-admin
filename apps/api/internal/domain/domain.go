package domain

import (
	"encoding/json"
	"time"
)

// Playable represents an interactive ad creative
type Playable struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Event represents a tracking event
type Event struct {
	ID           string          `json:"id"`
	PlayableID   int64           `json:"playable_id"`
	ExperimentID *int64          `json:"experiment_id,omitempty"`
	Type         string          `json:"type"` // impression, click, install
	Timestamp    time.Time       `json:"timestamp"`
	Metadata     json.RawMessage `json:"metadata,omitempty"`
}

// Experiment represents an A/B test
type Experiment struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// AnalyticsSummary represents aggregated metrics
type AnalyticsSummary struct {
	TotalImpressions int64   `json:"total_impressions"`
	TotalClicks      int64   `json:"total_clicks"`
	TotalInstalls    int64   `json:"total_installs"`
	CTR              float64 `json:"ctr"`
	IPM              float64 `json:"ipm"` // Installs per mille impressions
}

// PlayableAnalytics represents analytics for a specific playable
type PlayableAnalytics struct {
	PlayableID  int64            `json:"playable_id"`
	PlayableName string          `json:"playable_name"`
	Summary     AnalyticsSummary `json:"summary"`
}

// ExperimentAnalytics represents analytics for a specific experiment
type ExperimentAnalytics struct {
	ExperimentID   int64            `json:"experiment_id"`
	ExperimentName string           `json:"experiment_name"`
	Summary        AnalyticsSummary `json:"summary"`
}

// TimeSeriesData represents analytics data over time
type TimeSeriesData struct {
	Date        string `json:"date"`
	Impressions int64  `json:"impressions"`
	Clicks      int64  `json:"clicks"`
	Installs    int64  `json:"installs"`
	CTR         float64 `json:"ctr"`
	IPM         float64 `json:"ipm"`
}

// PlayableTimeSeriesAnalytics represents time series analytics for a playable
type PlayableTimeSeriesAnalytics struct {
	PlayableID   int64            `json:"playable_id"`
	PlayableName string           `json:"playable_name"`
	TimeSeries   []TimeSeriesData `json:"time_series"`
}
