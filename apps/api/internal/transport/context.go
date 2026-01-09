package transport

// This file is for context propagation helpers if needed in the future
// Currently using the standard context from requests

type contextKey string

const (
	requestIDKey contextKey = "request_id"
)
