package store

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/jackc/pgx/v5"
)

// eventsArrayLiteral renders a Go []string into a Postgres array text literal
// that is safe to cast with ::text[] under the simple query protocol.
func eventsArrayLiteral(events []string) string {
	if len(events) == 0 {
		return "{}"
	}
	parts := make([]string, 0, len(events))
	for _, e := range events {
		e = strings.TrimSpace(e)
		if e == "" {
			continue
		}
		esc := strings.ReplaceAll(e, `\`, `\\`)
		esc = strings.ReplaceAll(esc, `"`, `\"`)
		parts = append(parts, `"`+esc+`"`)
	}
	return "{" + strings.Join(parts, ",") + "}"
}

// parseEventsCSV reads the `array_to_string(events, ',')` output. Empty
// input means "subscribe to everything".
func parseEventsCSV(csv string) []string {
	csv = strings.TrimSpace(csv)
	if csv == "" {
		return []string{}
	}
	parts := strings.Split(csv, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		v := strings.TrimSpace(p)
		if v != "" {
			out = append(out, v)
		}
	}
	return out
}

// ListChannels returns every non-deleted notification channel for one org.
func (s *postgresStore) ListChannels(ctx context.Context, orgID int64) ([]NotificationChannel, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, organization_id, channel_type, name,
		        COALESCE(config_json::text, '{}'),
		        COALESCE(array_to_string(events, ','), ''),
		        is_active, created_at
		 FROM tab_notification_channel
		 WHERE organization_id = $1 AND deleted_at IS NULL
		 ORDER BY id`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []NotificationChannel{}
	for rows.Next() {
		var c NotificationChannel
		var cfg, ev string
		if err := rows.Scan(&c.ID, &c.OrganizationID, &c.ChannelType, &c.Name,
			&cfg, &ev, &c.IsActive, &c.CreatedAt); err != nil {
			return nil, err
		}
		c.ConfigJSON = json.RawMessage(cfg)
		c.Events = parseEventsCSV(ev)
		out = append(out, c)
	}
	return out, rows.Err()
}

// GetChannel returns one channel scoped to an org, used for edit/test.
func (s *postgresStore) GetChannel(ctx context.Context, id, orgID int64) (*NotificationChannel, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT id, organization_id, channel_type, name,
		        COALESCE(config_json::text, '{}'),
		        COALESCE(array_to_string(events, ','), ''),
		        is_active, created_at
		 FROM tab_notification_channel
		 WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
		id, orgID,
	)
	var c NotificationChannel
	var cfg, ev string
	if err := row.Scan(&c.ID, &c.OrganizationID, &c.ChannelType, &c.Name,
		&cfg, &ev, &c.IsActive, &c.CreatedAt); err != nil {
		return nil, err
	}
	c.ConfigJSON = json.RawMessage(cfg)
	c.Events = parseEventsCSV(ev)
	return &c, nil
}

// CreateChannel inserts a new channel row, returning the generated id.
// `events` defaults to an empty array (= subscribe to all events).
func (s *postgresStore) CreateChannel(ctx context.Context, c NotificationChannel) (int64, error) {
	cfg := []byte(c.ConfigJSON)
	if len(cfg) == 0 {
		cfg = []byte("{}")
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tab_notification_channel
		   (organization_id, channel_type, name, config_json, events, is_active)
		 VALUES ($1,$2,$3,$4::jsonb,$5::text[],$6)
		 RETURNING id`,
		c.OrganizationID, c.ChannelType, c.Name, string(cfg),
		eventsArrayLiteral(c.Events), c.IsActive,
	).Scan(&id)
	return id, err
}

// UpdateChannel overwrites every editable field on one channel.
func (s *postgresStore) UpdateChannel(ctx context.Context, id, orgID int64, c NotificationChannel) error {
	cfg := []byte(c.ConfigJSON)
	if len(cfg) == 0 {
		cfg = []byte("{}")
	}
	tag, err := s.pool.Exec(ctx,
		`UPDATE tab_notification_channel
		 SET channel_type = $3, name = $4, config_json = $5::jsonb,
		     events = $6::text[], is_active = $7, updated_at = NOW()
		 WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
		id, orgID, c.ChannelType, c.Name, string(cfg),
		eventsArrayLiteral(c.Events), c.IsActive,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// DeleteChannel soft-deletes one channel by setting deleted_at.
func (s *postgresStore) DeleteChannel(ctx context.Context, id, orgID int64) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_notification_channel SET deleted_at = NOW()
		 WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
		id, orgID,
	)
	return err
}
