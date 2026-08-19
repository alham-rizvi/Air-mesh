# Air-Mesh Base Camp Server

This Rust service is the offline rescue-coordination backend for an Air-Mesh base laptop. It receives structured shelter reports from courier devices over local Wi-Fi, stores them in SQLite, produces prioritized actions through a local Ollama model or deterministic mock mode, and serves the coordinator dashboard from `dashboard/dist`.

## Prerequisites

Install Rust 1.75 or newer. Ollama is optional for development and required only when using live local AI prioritization. The default model is `llama3.2:3b`.

## Run

From `base-laptop/`, use `cargo run`. The server listens on port `3000` by default. For an offline demo without Ollama, run `MOCK_AI=1 cargo run`. With Ollama installed, start Ollama and pull the model with `ollama pull llama3.2:3b` before starting the server.

The dashboard directory is created automatically when the server starts. Place the frontend build output in `dashboard/dist`; an empty directory is valid and the server still starts. Unknown non-API routes fall back to `index.html` for client-side routing.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/sync` | Upserts reports and audit logs, then stores the latest AI prioritization |
| GET | `/reports` | Returns reports ordered by timestamp descending |
| GET | `/insights` | Returns the latest prioritized-action array |
| GET | `/audit` | Returns audit logs ordered by timestamp descending |

`POST /sync` accepts `{ "reports": [...], "audit_logs": [...] }` and returns `{ "received": number }`. The service is intentionally unauthenticated for the hackathon LAN deployment; place it behind a trusted local hotspot or add an authentication layer before wider deployment.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP listening port |
| `DB_PATH` | `airmesh.db` | SQLite database path |
| `DASHBOARD_DIR` | `dashboard/dist` | Static dashboard directory |
| `OLLAMA_MODEL` | `llama3.2:3b` | Local Ollama model name |
| `MOCK_AI` | unset | Set to `1` to use deterministic local ranking without Ollama |

## Verification

Run `cargo fmt --check`, `cargo test`, and `cargo build`. A local smoke test can run the server with `MOCK_AI=1`, post a sync payload to `/sync`, and then read `/reports`, `/insights`, and `/audit`. The only outbound call in live mode is the Ollama request to `http://localhost:11434/api/generate`.
