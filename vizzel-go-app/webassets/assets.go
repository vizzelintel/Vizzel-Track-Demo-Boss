package webassets

import "embed"

//go:embed web/*
var FS embed.FS
