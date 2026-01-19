package service

import (
	"context"
	"playables-api/internal/domain"
	"time"
)

type AnalyticsRepository interface {
	GetSummary(ctx context.Context, startDate, endDate time.Time) (*domain.AnalyticsSummary, error)
	GetAnalyticsByPlayable(ctx context.Context, startDate, endDate time.Time) ([]domain.PlayableAnalytics, error)
	GetTimeSeriesByPlayable(ctx context.Context, playableID int64, startDate, endDate time.Time) ([]domain.TimeSeriesData, error)
	GetTimeSeriesAllPlayables(ctx context.Context, startDate, endDate time.Time) ([]domain.PlayableTimeSeriesAnalytics, error)
}

type AnalyticsService struct {
	repo         AnalyticsRepository
	playableRepo PlayableRepository
}

func NewAnalyticsService(repo AnalyticsRepository, playableRepo PlayableRepository) *AnalyticsService {
	return &AnalyticsService{
		repo:         repo,
		playableRepo: playableRepo,
	}
}

func (s *AnalyticsService) GetSummary(ctx context.Context, startDate, endDate time.Time) (*domain.AnalyticsSummary, error) {
	return s.repo.GetSummary(ctx, startDate, endDate)
}

func (s *AnalyticsService) GetAnalyticsByPlayable(ctx context.Context, startDate, endDate time.Time) ([]domain.PlayableAnalytics, error) {
	analytics, err := s.repo.GetAnalyticsByPlayable(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Filter and enrich with playable names - only include existing playables
	var filteredAnalytics []domain.PlayableAnalytics
	for _, item := range analytics {
		playable, err := s.playableRepo.GetPlayableByID(ctx, item.PlayableID)
		if err == nil {
			// Only include if playable exists
			item.PlayableName = playable.Name
			filteredAnalytics = append(filteredAnalytics, item)
		}
		// Skip deleted playables
	}

	return filteredAnalytics, nil
}

func (s *AnalyticsService) GetTimeSeriesByPlayable(ctx context.Context, playableID int64, startDate, endDate time.Time) ([]domain.TimeSeriesData, error) {
	return s.repo.GetTimeSeriesByPlayable(ctx, playableID, startDate, endDate)
}

func (s *AnalyticsService) GetTimeSeriesAllPlayables(ctx context.Context, startDate, endDate time.Time) ([]domain.PlayableTimeSeriesAnalytics, error) {
	analytics, err := s.repo.GetTimeSeriesAllPlayables(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}

	// Filter and enrich with playable names - only include existing playables
	var filteredAnalytics []domain.PlayableTimeSeriesAnalytics
	for _, item := range analytics {
		playable, err := s.playableRepo.GetPlayableByID(ctx, item.PlayableID)
		if err == nil {
			// Only include if playable exists
			item.PlayableName = playable.Name
			filteredAnalytics = append(filteredAnalytics, item)
		}
		// Skip deleted playables
	}

	return filteredAnalytics, nil
}
