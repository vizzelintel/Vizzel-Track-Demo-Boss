package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/config"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/server"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	st, err := store.Open(ctx, cfg.DBURL, cfg.SQLitePath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	if err := st.Migrate(ctx); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := st.SeedDemo(ctx, cfg.DemoEmail, cfg.DemoPassword, cfg.SeedAssetCount); err != nil {
		log.Fatalf("seed: %v", err)
	}

	srv := &http.Server{
		Addr:         cfg.Addr,
		Handler:      server.New(cfg, st),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("listening on http://localhost%s (db=%s)", trimColon(cfg.Addr), st.Driver())
		log.Printf("demo login: %s / %s", cfg.DemoEmail, cfg.DemoPassword)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

func trimColon(addr string) string {
	if addr == "" || addr[0] != ':' {
		return addr
	}
	return addr
}
