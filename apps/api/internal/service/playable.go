package service

import (
	"context"
	"errors"
	"playables-api/internal/domain"
)

type PlayableRepository interface {
	CreatePlayable(ctx context.Context, playable *domain.Playable) error
	GetPlayables(ctx context.Context) ([]domain.Playable, error)
	GetPlayableByID(ctx context.Context, id int64) (*domain.Playable, error)
	DeletePlayable(ctx context.Context, id int64) error
}

type EventDeleter interface {
	DeleteEventsByPlayableID(ctx context.Context, playableID int64) error
}

type PlayableService struct {
	repo         PlayableRepository
	eventDeleter EventDeleter
}

func NewPlayableService(repo PlayableRepository, eventDeleter EventDeleter) *PlayableService {
	return &PlayableService{
		repo:         repo,
		eventDeleter: eventDeleter,
	}
}

func (s *PlayableService) CreatePlayable(ctx context.Context, playable *domain.Playable) error {
	// Validation
	if playable.Name == "" {
		return errors.New("playable name is required")
	}
	if playable.Status == "" {
		playable.Status = "draft"
	}

	return s.repo.CreatePlayable(ctx, playable)
}

func (s *PlayableService) ListPlayables(ctx context.Context) ([]domain.Playable, error) {
	return s.repo.GetPlayables(ctx)
}

func (s *PlayableService) GetPlayable(ctx context.Context, id int64) (*domain.Playable, error) {
	return s.repo.GetPlayableByID(ctx, id)
}

func (s *PlayableService) DeletePlayable(ctx context.Context, id int64) error {
	// Verify playable exists
	_, err := s.repo.GetPlayableByID(ctx, id)
	if err != nil {
		return errors.New("playable not found")
	}

	// Delete associated events from ClickHouse first
	if s.eventDeleter != nil {
		if err := s.eventDeleter.DeleteEventsByPlayableID(ctx, id); err != nil {
			// Log error but don't fail the delete operation
			// This allows playable to be deleted even if ClickHouse is unavailable
			// In production, you might want to handle this differently
		}
	}

	// Delete playable from MySQL
	return s.repo.DeletePlayable(ctx, id)
}
