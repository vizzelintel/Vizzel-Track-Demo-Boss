package server

import (
	"io/fs"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/api"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/config"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/webassets"
)

func New(cfg config.Config, st store.Store) http.Handler {
	h := api.New(cfg, st)
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", h.Health)
		r.Post("/auth/login", h.Login)
		r.Group(func(r chi.Router) {
			r.Use(api.JWTAuth(cfg))
			r.Get("/assets", h.ListAssets)
		})
	})

	web, _ := fs.Sub(webassets.FS, "web")
	fileServer := http.FileServer(http.FS(web))
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, r)
	})
	r.Handle("/*", http.StripPrefix("/", fileServer))

	return r
}
