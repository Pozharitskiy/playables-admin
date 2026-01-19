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

func (r *MySQLRepository) DeletePlayable(ctx context.Context, id int64) error {
	query := `DELETE FROM playables WHERE id = ?`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	// Reset AUTO_INCREMENT to MAX(id) + 1 to avoid gaps
	var maxID sql.NullInt64
	maxIDQuery := `SELECT MAX(id) FROM playables`
	err = r.db.QueryRowContext(ctx, maxIDQuery).Scan(&maxID)
	if err != nil {
		// If query fails, continue anyway - not critical
		return nil
	}

	var nextID int64 = 1
	if maxID.Valid {
		nextID = maxID.Int64 + 1
	}

	resetQuery := `ALTER TABLE playables AUTO_INCREMENT = ?`
	_, err = r.db.ExecContext(ctx, resetQuery, nextID)
	if err != nil {
		// If reset fails, log but don't fail the delete operation
		// This is not critical for the delete operation itself
	}

	return nil
}
