package repository

import (
	"context"
	"database/sql"
	"playables-api/internal/domain"

	_ "github.com/go-sql-driver/mysql"
)

type MySQLRepository struct {
	db *sql.DB
}

func NewMySQLRepository(dsn string) (*MySQLRepository, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &MySQLRepository{db: db}, nil
}

func (r *MySQLRepository) Close() error {
	return r.db.Close()
}

// Playable methods
func (r *MySQLRepository) CreatePlayable(ctx context.Context, playable *domain.Playable) error {
	query := `INSERT INTO playables (name, description, status) VALUES (?, ?, ?)`
	result, err := r.db.ExecContext(ctx, query, playable.Name, playable.Description, playable.Status)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	playable.ID = id
	return nil
}

func (r *MySQLRepository) GetPlayables(ctx context.Context) ([]domain.Playable, error) {
	query := `SELECT id, name, description, status, created_at, updated_at FROM playables ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var playables []domain.Playable
	for rows.Next() {
		var p domain.Playable
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Status, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		playables = append(playables, p)
	}

	return playables, rows.Err()
}

func (r *MySQLRepository) GetPlayableByID(ctx context.Context, id int64) (*domain.Playable, error) {
	query := `SELECT id, name, description, status, created_at, updated_at FROM playables WHERE id = ?`
	var p domain.Playable
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// Experiment methods
func (r *MySQLRepository) GetExperiments(ctx context.Context) ([]domain.Experiment, error) {
	query := `SELECT id, name, description, status, created_at, updated_at FROM experiments ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var experiments []domain.Experiment
	for rows.Next() {
		var e domain.Experiment
		err := rows.Scan(&e.ID, &e.Name, &e.Description, &e.Status, &e.CreatedAt, &e.UpdatedAt)
		if err != nil {
			return nil, err
		}
		experiments = append(experiments, e)
	}

	return experiments, rows.Err()
}
