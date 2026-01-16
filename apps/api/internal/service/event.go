package service

import (
	"context"
	"errors"
	"log"
	"playables-api/internal/domain"
	"time"

	"github.com/google/uuid"
)

type EventPublisher interface {
	PublishEvent(event *domain.Event) error
}

type EventService struct {
	publisher EventPublisher
	repo      PlayableRepository
}

func NewEventService(publisher EventPublisher, repo PlayableRepository) *EventService {
	return &EventService{
		publisher: publisher,
		repo:      repo,
	}
}

func (s *EventService) TrackEvent(ctx context.Context, event *domain.Event) error {
	// Validation
	if event.PlayableID == 0 {
		return errors.New("playable_id is required")
	}

	if event.Type != "impression" && event.Type != "click" && event.Type != "install" {
		return errors.New("event type must be impression, click, or install")
	}

	// Verify playable exists
	_, err := s.repo.GetPlayableByID(ctx, event.PlayableID)
	if err != nil {
		return errors.New("playable not found")
	}

	// Generate ID and set timestamp
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	log.Printf("EventService: Publishing event to NATS - ID=%s, Type=%s, PlayableID=%d", 
		event.ID, event.Type, event.PlayableID)

	// Publish to NATS for async processing
	err = s.publisher.PublishEvent(event)
	if err != nil {
		log.Printf("EventService: Failed to publish event to NATS: %v", err)
		return err
	}

	log.Printf("EventService: Successfully published event to NATS - ID=%s", event.ID)
	return nil
}
