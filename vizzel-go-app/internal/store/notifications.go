package store

import (
	"context"
	"fmt"
	"time"
)

// CreateNotification inserts a single bell-list entry and returns its id.
// Missing optional fields are stored as NULL where appropriate.
func (s *postgresStore) CreateNotification(ctx context.Context, n Notification) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tab_notification
		   (organization_id, user_id, event_type, title, body, link, ref_type, ref_id)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 RETURNING id`,
		nullInt64(n.OrganizationID), nullInt64(n.UserID), n.EventType, n.Title,
		nullStr(n.Body), nullStr(n.Link), nullStr(n.RefType), nullInt64(n.RefID),
	).Scan(&id)
	return id, err
}

// BulkCreateNotifications fans one event out into many recipient rows. The
// operation is best-effort: a failed row aborts the whole batch.
func (s *postgresStore) BulkCreateNotifications(ctx context.Context, list []Notification) error {
	if len(list) == 0 {
		return nil
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, n := range list {
		if _, err := tx.Exec(ctx,
			`INSERT INTO tab_notification
			   (organization_id, user_id, event_type, title, body, link, ref_type, ref_id)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			nullInt64(n.OrganizationID), nullInt64(n.UserID), n.EventType, n.Title,
			nullStr(n.Body), nullStr(n.Link), nullStr(n.RefType), nullInt64(n.RefID),
		); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// ListNotifications returns a page of bell rows for one user, newest first.
// When unreadOnly is true only is_read = false rows are returned.
func (s *postgresStore) ListNotifications(ctx context.Context, userID int64, page, pageSize int, unreadOnly bool) ([]Notification, int, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 20
	}
	where := `WHERE user_id = $1`
	if unreadOnly {
		where += ` AND is_read = FALSE`
	}

	var total int
	if err := s.pool.QueryRow(ctx,
		fmt.Sprintf(`SELECT COUNT(*)::int FROM tab_notification %s`, where), userID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	rows, err := s.pool.Query(ctx,
		fmt.Sprintf(`SELECT id, COALESCE(organization_id,0), COALESCE(user_id,0), event_type, title,
		        COALESCE(body,''), COALESCE(link,''), COALESCE(ref_type,''), COALESCE(ref_id,0),
		        is_read, read_at, created_at
		 FROM tab_notification %s
		 ORDER BY created_at DESC, id DESC
		 LIMIT $2 OFFSET $3`, where),
		userID, pageSize, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []Notification
	for rows.Next() {
		var n Notification
		var readAt *time.Time
		if err := rows.Scan(&n.ID, &n.OrganizationID, &n.UserID, &n.EventType, &n.Title,
			&n.Body, &n.Link, &n.RefType, &n.RefID, &n.IsRead, &readAt, &n.CreatedAt); err != nil {
			return nil, 0, err
		}
		n.ReadAt = readAt
		out = append(out, n)
	}
	return out, total, rows.Err()
}

// CountUnread reports how many unread bell rows the user has.
func (s *postgresStore) CountUnread(ctx context.Context, userID int64) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*)::int FROM tab_notification WHERE user_id = $1 AND is_read = FALSE`,
		userID,
	).Scan(&n)
	return n, err
}

// MarkRead flips a single row to is_read = true. The user_id constraint
// keeps users from marking other people's notifications.
func (s *postgresStore) MarkRead(ctx context.Context, id, userID int64) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_notification SET is_read = TRUE, read_at = NOW()
		 WHERE id = $1 AND user_id = $2 AND is_read = FALSE`,
		id, userID,
	)
	return err
}

// MarkAllRead flips every unread row for one user.
func (s *postgresStore) MarkAllRead(ctx context.Context, userID int64) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_notification SET is_read = TRUE, read_at = NOW()
		 WHERE user_id = $1 AND is_read = FALSE`,
		userID,
	)
	return err
}
