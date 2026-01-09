CREATE DATABASE IF NOT EXISTS playables;
USE playables;

CREATE TABLE IF NOT EXISTS playables (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS experiments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
INSERT INTO playables (name, description, status) VALUES
    ('Puzzle Adventure', 'Match-3 puzzle game', 'active'),
    ('Racing Fury', 'Fast-paced racing game', 'active'),
    ('Tower Defense Pro', 'Strategic tower defense', 'draft');

INSERT INTO experiments (name, description, status) VALUES
    ('Color Scheme A/B Test', 'Testing blue vs green theme', 'active'),
    ('CTA Button Test', 'Testing button placement', 'active');
