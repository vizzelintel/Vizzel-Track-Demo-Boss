// Boots the Go server binary for the Playwright suite.
// Uses a per-run SQLite file so tests start from a clean seed.

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const BIN_NAME = process.platform === "win32" ? "server.exe" : "server";
const BIN = join(ROOT, "bin", BIN_NAME);
const STATE_DIR = join(ROOT, "e2e", ".state");

if (!existsSync(BIN)) {
  console.error(`[e2e] server binary missing: ${BIN}`);
  console.error("[e2e] run `go build -o bin/server.exe ./cmd/server` first");
  process.exit(1);
}

try {
  rmSync(STATE_DIR, { recursive: true, force: true });
} catch {}
mkdirSync(STATE_DIR, { recursive: true });

const sqlitePath = join(STATE_DIR, "e2e.db");
const env = {
  ...process.env,
  ADDR: ":18080",
  SQLITE_PATH: sqlitePath,
  DEMO_EMAIL: "admin@demo.local",
  DEMO_PASSWORD: "demo1234",
  SEED_ASSET_COUNT: "50",
  JWT_SECRET: "vizzel-e2e-test-secret",
};

const child = spawn(BIN, [], { env, stdio: "inherit", cwd: ROOT });

const shutdown = () => {
  try {
    child.kill("SIGTERM");
  } catch {}
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);

child.on("exit", (code) => {
  console.log(`[e2e] server exited with ${code}`);
  process.exit(code ?? 0);
});
