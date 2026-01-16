package repository

import (
	"encoding/json"
	"log"
	"playables-api/internal/domain"

	"github.com/nats-io/nats.go"
)

const (
	EventsSubject = "playables.events"
)

type NATSClient struct {
	conn *nats.Conn
}

func NewNATSClient(url string) (*NATSClient, error) {
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, err
	}

	return &NATSClient{conn: conn}, nil
}

func (c *NATSClient) Close() error {
	c.conn.Close()
	return nil
}

func (c *NATSClient) PublishEvent(event *domain.Event) error {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("NATS: Failed to marshal event: %v", err)
		return err
	}

	log.Printf("NATS: Publishing event to subject '%s' - ID=%s, Type=%s, PlayableID=%d", 
		EventsSubject, event.ID, event.Type, event.PlayableID)

	err = c.conn.Publish(EventsSubject, data)
	if err != nil {
		log.Printf("NATS: Failed to publish event: %v", err)
		return err
	}

	log.Printf("NATS: Successfully published event - ID=%s", event.ID)
	return nil
}

func (c *NATSClient) SubscribeEvents(handler func(*domain.Event) error) error {
	log.Printf("NATS: Subscribing to subject '%s'", EventsSubject)
	
	sub, err := c.conn.Subscribe(EventsSubject, func(msg *nats.Msg) {
		log.Printf("NATS: Received message on subject '%s', size=%d bytes", EventsSubject, len(msg.Data))
		
		var event domain.Event
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			log.Printf("NATS: Failed to unmarshal event: %v", err)
			return
		}
		
		log.Printf("NATS: Unmarshaled event - ID=%s, Type=%s, PlayableID=%d", 
			event.ID, event.Type, event.PlayableID)
		
		if err := handler(&event); err != nil {
			log.Printf("NATS: Handler returned error: %v", err)
		}
	})
	
	if err != nil {
		log.Printf("NATS: Failed to subscribe: %v", err)
		return err
	}
	
	log.Printf("NATS: Successfully subscribed to '%s', subscription=%v", EventsSubject, sub)
	return nil
}
