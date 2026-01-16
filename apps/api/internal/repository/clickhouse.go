package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"playables-api/internal/domain"
	"time"

	_ "github.com/ClickHouse/clickhouse-go/v2"
)

type ClickHouseRepository struct {
	db *sql.DB
}

func NewClickHouseRepository(dsn string) (*ClickHouseRepository, error) {
	db, err := sql.Open("clickhouse", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &ClickHouseRepository{db: db}, nil
}

func (r *ClickHouseRepository) Close() error {
	return r.db.Close()
}

func (r *ClickHouseRepository) InsertEvents(ctx context.Context, events []domain.Event) error {
	if len(events) == 0 {
		return nil
	}

	// ClickHouse bulk insert using VALUES with multiple rows
	// Build the query with placeholders for all events
	query := "INSERT INTO events (id, playable_id, experiment_id, type, timestamp, metadata) VALUES "
	args := make([]interface{}, 0, len(events)*6)

	for i, event := range events {
		if i > 0 {
			query += ", "
		}
		query += "(?, ?, ?, ?, ?, ?)"
		args = append(args,
			event.ID,
			event.PlayableID,
			event.ExperimentID,
			event.Type,
			event.Timestamp,
			string(event.Metadata),
		)
	}

	// Execute bulk insert
	_, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to insert events: %w", err)
	}

	log.Printf("Successfully inserted %d events to ClickHouse", len(events))
	return nil
}

func (r *ClickHouseRepository) GetSummary(ctx context.Context, startDate, endDate time.Time) (*domain.AnalyticsSummary, error) {
	query := `
		SELECT 
			countIf(type = 'impression') as impressions,
			countIf(type = 'click') as clicks,
			countIf(type = 'install') as installs
		FROM events
		WHERE timestamp >= ? AND timestamp <= ?
	`

	var impressions, clicks, installs int64
	err := r.db.QueryRowContext(ctx, query, startDate, endDate).Scan(&impressions, &clicks, &installs)
	if err != nil {
		return nil, err
	}

	ctr := 0.0
	if impressions > 0 {
		ctr = float64(clicks) / float64(impressions) * 100
	}

	ipm := 0.0
	if impressions > 0 {
		ipm = float64(installs) / float64(impressions) * 1000
	}

	return &domain.AnalyticsSummary{
		TotalImpressions: impressions,
		TotalClicks:      clicks,
		TotalInstalls:    installs,
		CTR:              ctr,
		IPM:              ipm,
	}, nil
}

func (r *ClickHouseRepository) GetAnalyticsByPlayable(ctx context.Context, startDate, endDate time.Time) ([]domain.PlayableAnalytics, error) {
	query := `
		SELECT 
			playable_id,
			countIf(type = 'impression') as impressions,
			countIf(type = 'click') as clicks,
			countIf(type = 'install') as installs
		FROM events
		WHERE timestamp >= ? AND timestamp <= ?
		GROUP BY playable_id
		ORDER BY impressions DESC
	`

	rows, err := r.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []domain.PlayableAnalytics
	for rows.Next() {
		var playableID, impressions, clicks, installs int64
		err := rows.Scan(&playableID, &impressions, &clicks, &installs)
		if err != nil {
			return nil, err
		}

		ctr := 0.0
		if impressions > 0 {
			ctr = float64(clicks) / float64(impressions) * 100
		}

		ipm := 0.0
		if impressions > 0 {
			ipm = float64(installs) / float64(impressions) * 1000
		}

		results = append(results, domain.PlayableAnalytics{
			PlayableID:   playableID,
			PlayableName: fmt.Sprintf("Playable %d", playableID),
			Summary: domain.AnalyticsSummary{
				TotalImpressions: impressions,
				TotalClicks:      clicks,
				TotalInstalls:    installs,
				CTR:              ctr,
				IPM:              ipm,
			},
		})
	}

	return results, rows.Err()
}

func (r *ClickHouseRepository) GetAnalyticsByExperiment(ctx context.Context, startDate, endDate time.Time) ([]domain.ExperimentAnalytics, error) {
	query := `
		SELECT 
			experiment_id,
			countIf(type = 'impression') as impressions,
			countIf(type = 'click') as clicks,
			countIf(type = 'install') as installs
		FROM events
		WHERE timestamp >= ? AND timestamp <= ? AND experiment_id IS NOT NULL
		GROUP BY experiment_id
		ORDER BY impressions DESC
	`

	rows, err := r.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []domain.ExperimentAnalytics
	for rows.Next() {
		var experimentID, impressions, clicks, installs int64
		err := rows.Scan(&experimentID, &impressions, &clicks, &installs)
		if err != nil {
			return nil, err
		}

		ctr := 0.0
		if impressions > 0 {
			ctr = float64(clicks) / float64(impressions) * 100
		}

		ipm := 0.0
		if impressions > 0 {
			ipm = float64(installs) / float64(impressions) * 1000
		}

		results = append(results, domain.ExperimentAnalytics{
			ExperimentID:   experimentID,
			ExperimentName: fmt.Sprintf("Experiment %d", experimentID),
			Summary: domain.AnalyticsSummary{
				TotalImpressions: impressions,
				TotalClicks:      clicks,
				TotalInstalls:    installs,
				CTR:              ctr,
				IPM:              ipm,
			},
		})
	}

	return results, rows.Err()
}

func (r *ClickHouseRepository) GetTimeSeriesByPlayable(ctx context.Context, playableID int64, startDate, endDate time.Time) ([]domain.TimeSeriesData, error) {
	query := `
		SELECT 
			toDate(timestamp) as date,
			countIf(type = 'impression') as impressions,
			countIf(type = 'click') as clicks,
			countIf(type = 'install') as installs
		FROM events
		WHERE playable_id = ? AND timestamp >= ? AND timestamp <= ?
		GROUP BY date
		ORDER BY date ASC
	`

	rows, err := r.db.QueryContext(ctx, query, playableID, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []domain.TimeSeriesData
	for rows.Next() {
		var date time.Time
		var impressions, clicks, installs int64
		err := rows.Scan(&date, &impressions, &clicks, &installs)
		if err != nil {
			return nil, err
		}

		ctr := 0.0
		if impressions > 0 {
			ctr = float64(clicks) / float64(impressions) * 100
		}

		ipm := 0.0
		if impressions > 0 {
			ipm = float64(installs) / float64(impressions) * 1000
		}

		results = append(results, domain.TimeSeriesData{
			Date:        date.Format("2006-01-02"),
			Impressions: impressions,
			Clicks:      clicks,
			Installs:    installs,
			CTR:         ctr,
			IPM:         ipm,
		})
	}

	return results, rows.Err()
}

func (r *ClickHouseRepository) GetTimeSeriesAllPlayables(ctx context.Context, startDate, endDate time.Time) ([]domain.PlayableTimeSeriesAnalytics, error) {
	query := `
		SELECT 
			playable_id,
			toDate(timestamp) as date,
			countIf(type = 'impression') as impressions,
			countIf(type = 'click') as clicks,
			countIf(type = 'install') as installs
		FROM events
		WHERE timestamp >= ? AND timestamp <= ?
		GROUP BY playable_id, date
		ORDER BY playable_id, date ASC
	`

	rows, err := r.db.QueryContext(ctx, query, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Group results by playable_id
	playableMap := make(map[int64][]domain.TimeSeriesData)
	for rows.Next() {
		var playableID int64
		var date time.Time
		var impressions, clicks, installs int64
		err := rows.Scan(&playableID, &date, &impressions, &clicks, &installs)
		if err != nil {
			return nil, err
		}

		ctr := 0.0
		if impressions > 0 {
			ctr = float64(clicks) / float64(impressions) * 100
		}

		ipm := 0.0
		if impressions > 0 {
			ipm = float64(installs) / float64(impressions) * 1000
		}

		playableMap[playableID] = append(playableMap[playableID], domain.TimeSeriesData{
			Date:        date.Format("2006-01-02"),
			Impressions: impressions,
			Clicks:      clicks,
			Installs:    installs,
			CTR:         ctr,
			IPM:         ipm,
		})
	}

	var results []domain.PlayableTimeSeriesAnalytics
	for playableID, timeSeries := range playableMap {
		results = append(results, domain.PlayableTimeSeriesAnalytics{
			PlayableID:   playableID,
			PlayableName: fmt.Sprintf("Playable %d", playableID),
			TimeSeries:   timeSeries,
		})
	}

	return results, rows.Err()
}
