// Package notify implements the centralized dispatcher that writes in-app
// notifications and fans them out to configured outbound channels (LINE
// Messaging API, LINE Notify, generic webhooks, Discord).
//
// The dispatcher is fire-and-forget for outbound channels: the inbound
// persistence is synchronous (we want the bell to update right away), but
// every HTTP call to a third party runs in its own goroutine and never
// blocks the request that triggered it. Failures are logged and dropped.
package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

// Channel type constants — keep in sync with the frontend Channel form.
const (
	ChannelLineMessaging = "line_messaging"
	ChannelLineNotify    = "line_notify"
	ChannelWebhook       = "webhook_generic"
	ChannelDiscord       = "discord"
)

// Event describes one thing that just happened. The dispatcher will:
//   - persist one tab_notification row per UserID
//   - fan out to active channels in OrganizationID that subscribe to EventType
type Event struct {
	OrganizationID int64
	UserIDs        []int64
	EventType      string
	Title          string
	Body           string
	Link           string
	RefType        string
	RefID          int64
}

// Dispatcher writes to the store and POSTs to outbound channels.
type Dispatcher struct {
	Store store.Store
	HTTP  *http.Client
}

// New returns a Dispatcher with sensible HTTP defaults.
func New(s store.Store) *Dispatcher {
	return &Dispatcher{
		Store: s,
		HTTP:  &http.Client{Timeout: 5 * time.Second},
	}
}

// Dispatch persists the in-app rows synchronously, then fires the outbound
// channels asynchronously. The returned error only covers the in-app write
// — outbound failures are logged but never bubble up.
func (d *Dispatcher) Dispatch(ctx context.Context, ev Event) error {
	if d == nil || d.Store == nil {
		return nil
	}
	if ev.EventType == "" || ev.Title == "" {
		return fmt.Errorf("notify: event_type and title are required")
	}

	rows := make([]store.Notification, 0, len(ev.UserIDs))
	for _, uid := range ev.UserIDs {
		if uid <= 0 {
			continue
		}
		rows = append(rows, store.Notification{
			OrganizationID: ev.OrganizationID,
			UserID:         uid,
			EventType:      ev.EventType,
			Title:          ev.Title,
			Body:           ev.Body,
			Link:           ev.Link,
			RefType:        ev.RefType,
			RefID:          ev.RefID,
		})
	}
	if len(rows) > 0 {
		if err := d.Store.BulkCreateNotifications(ctx, rows); err != nil {
			log.Printf("notify: persist failed: %v", err)
		}
	}

	channels, err := d.Store.ListChannels(ctx, ev.OrganizationID)
	if err != nil {
		log.Printf("notify: list channels failed: %v", err)
		return nil
	}

	for _, ch := range channels {
		if !ch.IsActive {
			continue
		}
		if !channelSubscribesTo(ch.Events, ev.EventType) {
			continue
		}
		ch := ch
		ev := ev
		go func() {
			bg, cancel := context.WithTimeout(context.Background(), 6*time.Second)
			defer cancel()
			if err := d.dispatchChannel(bg, ch, ev); err != nil {
				log.Printf("notify: channel %d (%s) failed: %v", ch.ID, ch.ChannelType, err)
			}
		}()
	}
	return nil
}

func channelSubscribesTo(events []string, eventType string) bool {
	if len(events) == 0 {
		return true
	}
	for _, e := range events {
		if strings.EqualFold(strings.TrimSpace(e), eventType) {
			return true
		}
	}
	return false
}

func (d *Dispatcher) dispatchChannel(ctx context.Context, ch store.NotificationChannel, ev Event) error {
	cfg, err := parseConfig(ch.ConfigJSON)
	if err != nil {
		return fmt.Errorf("parse config: %w", err)
	}
	switch ch.ChannelType {
	case ChannelLineMessaging:
		return d.sendLineMessaging(ctx, cfg, ev)
	case ChannelLineNotify:
		return d.sendLineNotify(ctx, cfg, ev)
	case ChannelWebhook:
		return d.sendWebhook(ctx, cfg, ev)
	case ChannelDiscord:
		return d.sendDiscord(ctx, cfg, ev)
	default:
		return fmt.Errorf("unknown channel type: %s", ch.ChannelType)
	}
}

type channelConfig struct {
	Token     string `json:"token"`
	Recipient string `json:"recipient"`
	URL       string `json:"url"`
}

func parseConfig(raw json.RawMessage) (channelConfig, error) {
	var c channelConfig
	if len(raw) == 0 {
		return c, nil
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return c, err
	}
	return c, nil
}

func (d *Dispatcher) sendLineMessaging(ctx context.Context, cfg channelConfig, ev Event) error {
	if cfg.Token == "" || cfg.Recipient == "" {
		log.Printf("notify: line_messaging skipped (missing token or recipient)")
		return nil
	}
	body := map[string]any{
		"to": cfg.Recipient,
		"messages": []map[string]any{
			{"type": "text", "text": composeText(ev)},
		},
	}
	buf, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.line.me/v2/bot/message/push", bytes.NewReader(buf))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.Token)
	return d.do(req)
}

func (d *Dispatcher) sendLineNotify(ctx context.Context, cfg channelConfig, ev Event) error {
	if cfg.Token == "" {
		log.Printf("notify: line_notify skipped (missing token)")
		return nil
	}
	form := url.Values{}
	form.Set("message", composeText(ev))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://notify-api.line.me/api/notify", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+cfg.Token)
	return d.do(req)
}

func (d *Dispatcher) sendWebhook(ctx context.Context, cfg channelConfig, ev Event) error {
	if cfg.URL == "" {
		log.Printf("notify: webhook_generic skipped (missing url)")
		return nil
	}
	body := map[string]any{
		"title":     ev.Title,
		"body":      ev.Body,
		"link":      ev.Link,
		"eventType": ev.EventType,
		"refType":   ev.RefType,
		"refId":     ev.RefID,
	}
	buf, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, bytes.NewReader(buf))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	return d.do(req)
}

func (d *Dispatcher) sendDiscord(ctx context.Context, cfg channelConfig, ev Event) error {
	if cfg.URL == "" {
		log.Printf("notify: discord skipped (missing url)")
		return nil
	}
	content := fmt.Sprintf("**%s**\n%s", ev.Title, ev.Body)
	if strings.TrimSpace(ev.Link) != "" {
		content += "\n" + ev.Link
	}
	body := map[string]any{"content": content}
	buf, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.URL, bytes.NewReader(buf))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	return d.do(req)
}

func (d *Dispatcher) do(req *http.Request) error {
	resp, err := d.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("http %d: %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	io.Copy(io.Discard, resp.Body)
	return nil
}

func composeText(ev Event) string {
	if ev.Body == "" {
		return ev.Title
	}
	return ev.Title + "\n" + ev.Body
}
