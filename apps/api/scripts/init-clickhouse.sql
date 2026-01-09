CREATE DATABASE IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.events (
    id String,
    playable_id Int64,
    experiment_id Nullable(Int64),
    type String,
    timestamp DateTime,
    metadata String,
    date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (playable_id, type, timestamp)
SETTINGS index_granularity = 8192;
