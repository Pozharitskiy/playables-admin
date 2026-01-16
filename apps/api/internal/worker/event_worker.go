package worker

import (
	"context"
	"log"
	"playables-api/internal/domain"
	"time"
)

type EventSubscriber interface {
	SubscribeEvents(handler func(*domain.Event) error) error
}

type EventRepository interface {
	InsertEvents(ctx context.Context, events []domain.Event) error
}

type EventWorker struct {
	subscriber EventSubscriber
	repository EventRepository
	buffer     []domain.Event
	bufferSize int
	flushTimer *time.Timer
}

func NewEventWorker(subscriber EventSubscriber, repository EventRepository) *EventWorker {
	return &EventWorker{
		subscriber: subscriber,
		repository: repository,
		buffer:     make([]domain.Event, 0),
		bufferSize: 100, // Batch size
	}
}

func (w *EventWorker) Start() {
	log.Println("Starting event worker...")

	w.flushTimer = time.NewTimer(5 * time.Second)

	go func() {
		for range w.flushTimer.C {
			w.flush()
			w.flushTimer.Reset(5 * time.Second)
		}
	}()

	err := w.subscriber.SubscribeEvents(func(event *domain.Event) error {
		log.Printf("Received event: type=%s, playable_id=%d, timestamp=%v", 
			event.Type, event.PlayableID, event.Timestamp)
		
		w.buffer = append(w.buffer, *event)
		log.Printf("Buffer size: %d/%d", len(w.buffer), w.bufferSize)

		if len(w.buffer) >= w.bufferSize {
			log.Println("Buffer full, flushing immediately")
			w.flush()
		}

		return nil
	})

	if err != nil {
		log.Printf("Failed to subscribe to events: %v", err)
	} else {
		log.Println("Successfully subscribed to NATS events")
	}
}

func (w *EventWorker) flush() {
	if len(w.buffer) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	eventsToFlush := make([]domain.Event, len(w.buffer))
	copy(eventsToFlush, w.buffer)
	
	log.Printf("Flushing %d events to ClickHouse", len(eventsToFlush))

	if err := w.repository.InsertEvents(ctx, eventsToFlush); err != nil {
		log.Printf("Failed to insert events: %v", err)
		// Don't clear buffer on error - will retry on next flush
		return
	}

	// Buffer cleared successfully (logging is done in repository)
	w.buffer = make([]domain.Event, 0)
}
