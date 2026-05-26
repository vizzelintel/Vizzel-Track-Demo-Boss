package store

import "context"

// SQLite is a dev-only fallback. Notifications & outbound channels live in
// Postgres for the real demo; we stub the interface methods here so the
// build stays green.

func (s *sqliteStore) CreateNotification(ctx context.Context, n Notification) (int64, error) {
	return 0, nil
}

func (s *sqliteStore) BulkCreateNotifications(ctx context.Context, list []Notification) error {
	return nil
}

func (s *sqliteStore) ListNotifications(ctx context.Context, userID int64, page, pageSize int, unreadOnly bool) ([]Notification, int, error) {
	return []Notification{}, 0, nil
}

func (s *sqliteStore) CountUnread(ctx context.Context, userID int64) (int, error) {
	return 0, nil
}

func (s *sqliteStore) MarkRead(ctx context.Context, id, userID int64) error {
	return nil
}

func (s *sqliteStore) MarkAllRead(ctx context.Context, userID int64) error {
	return nil
}

func (s *sqliteStore) ListChannels(ctx context.Context, orgID int64) ([]NotificationChannel, error) {
	return []NotificationChannel{}, nil
}

func (s *sqliteStore) GetChannel(ctx context.Context, id, orgID int64) (*NotificationChannel, error) {
	return nil, nil
}

func (s *sqliteStore) CreateChannel(ctx context.Context, c NotificationChannel) (int64, error) {
	return 0, nil
}

func (s *sqliteStore) UpdateChannel(ctx context.Context, id, orgID int64, c NotificationChannel) error {
	return nil
}

func (s *sqliteStore) DeleteChannel(ctx context.Context, id, orgID int64) error {
	return nil
}
