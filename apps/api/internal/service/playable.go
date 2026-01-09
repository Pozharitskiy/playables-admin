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
}

type PlayableService struct {
	repo PlayableRepository
}

func NewPlayableService(repo PlayableRepository) *PlayableService {
	return &PlayableService{repo: repo}
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
