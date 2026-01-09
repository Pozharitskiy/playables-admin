package repository

import (
	"encoding/json"
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
		return err
	}

	return c.conn.Publish(EventsSubject, data)
}

func (c *NATSClient) SubscribeEvents(handler func(*domain.Event) error) error {
	_, err := c.conn.Subscribe(EventsSubject, func(msg *nats.Msg) {
		var event domain.Event
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			return
		}
		handler(&event)
	})
	return err
}
