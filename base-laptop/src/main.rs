mod ai;
mod db;
mod models;

use axum::{
    extract::State,
    http::{header, HeaderValue, StatusCode, Uri},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use models::{SyncRequest, SyncResponse};
use rusqlite::Connection;
use std::{
    env,
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tokio::fs;
use tower_http::cors::CorsLayer;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: Arc<Mutex<Connection>>,
    dashboard_dir: PathBuf,
    ollama_model: String,
    mock_ai: bool,
}

#[tokio::main]
async fn main() -> anyhowless::Result<()> {
    let port = env::var("PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3000u16);
    let db_path = env::var("DB_PATH").unwrap_or_else(|_| "airmesh.db".into());
    let dashboard_dir =
        PathBuf::from(env::var("DASHBOARD_DIR").unwrap_or_else(|_| "dashboard/dist".into()));
    fs::create_dir_all(&dashboard_dir).await?;
    let conn = Connection::open(db_path)?;
    db::init(&conn)?;
    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
        dashboard_dir,
        ollama_model: env::var("OLLAMA_MODEL").unwrap_or_else(|_| "llama3.2:3b".into()),
        mock_ai: env::var("MOCK_AI").as_deref() == Ok("1"),
    };
    let app = Router::new()
        .route("/sync", post(sync))
        .route("/reports", get(reports))
        .route("/insights", get(insights))
        .route("/audit", get(audit))
        .route("/health", get(health))
        .fallback(static_dashboard)
        .layer(CorsLayer::permissive())
        .with_state(state);
    let address = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Air-Mesh base camp listening on http://{address}");
    let listener = tokio::net::TcpListener::bind(address).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn sync(State(state): State<AppState>, Json(payload): Json<SyncRequest>) -> Response {
    let count = payload.reports.len();
    let reports_for_ai = payload.reports.clone();
    let result = {
        let conn = state.db.lock().expect("database mutex poisoned");
        for report in &payload.reports {
            if let Err(error) = db::upsert_report(&conn, report) {
                return (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response();
            }
        }
        for log in &payload.audit_logs {
            if let Err(error) = db::upsert_audit(&conn, log) {
                return (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response();
            }
        }
        Ok::<(), String>(())
    };
    if let Err(error) = result {
        return (StatusCode::INTERNAL_SERVER_ERROR, error).into_response();
    }
    let actions = ai::prioritize_reports(&reports_for_ai, &state.ollama_model, state.mock_ai).await;
    let conn = state.db.lock().expect("database mutex poisoned");
    if let Err(error) = db::store_insights(&conn, &actions, &Utc::now().to_rfc3339()) {
        return (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response();
    }
    let audit = models::AuditLog {
        id: Uuid::new_v4().to_string(),
        device_id: "base-camp".into(),
        timestamp: Utc::now().to_rfc3339(),
        action: "ai_prioritized".into(),
        details: serde_json::json!({"report_count": count, "mock": state.mock_ai}),
    };
    let _ = db::upsert_audit(&conn, &audit);
    Json(SyncResponse { received: count }).into_response()
}

async fn reports(State(state): State<AppState>) -> Response {
    let conn = state.db.lock().expect("database mutex poisoned");
    match db::get_reports(&conn) {
        Ok(value) => Json(value).into_response(),
        Err(error) => (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response(),
    }
}
async fn insights(State(state): State<AppState>) -> Response {
    let conn = state.db.lock().expect("database mutex poisoned");
    match db::latest_insights(&conn) {
        Ok(value) => Json(value).into_response(),
        Err(error) => (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response(),
    }
}
async fn audit(State(state): State<AppState>) -> Response {
    let conn = state.db.lock().expect("database mutex poisoned");
    match db::get_audit(&conn) {
        Ok(value) => Json(value).into_response(),
        Err(error) => (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response(),
    }
}

async fn health(State(state): State<AppState>) -> Response {
    Json(serde_json::json!({
        "service": "air-mesh-base-camp",
        "status": "ready",
        "sync_endpoint": "/sync",
        "transport": "local-http",
        "mock_ai": state.mock_ai,
    }))
    .into_response()
}

async fn static_dashboard(State(state): State<AppState>, uri: Uri) -> Response {
    let request_path = uri.path().trim_start_matches('/');
    if request_path.starts_with("reports")
        || request_path.starts_with("insights")
        || request_path.starts_with("audit")
        || request_path.starts_with("health")
        || request_path.starts_with("sync")
    {
        return StatusCode::NOT_FOUND.into_response();
    }
    let safe_path = Path::new(request_path);
    let candidate = if request_path.is_empty() {
        state.dashboard_dir.join("index.html")
    } else {
        state.dashboard_dir.join(safe_path)
    };
    let path = if candidate.is_file() {
        candidate
    } else {
        state.dashboard_dir.join("index.html")
    };
    match fs::read(&path).await {
        Ok(bytes) => {
            let content_type = if path.extension().and_then(|v| v.to_str()) == Some("html") {
                "text/html; charset=utf-8"
            } else if path.extension().and_then(|v| v.to_str()) == Some("js") {
                "application/javascript"
            } else if path.extension().and_then(|v| v.to_str()) == Some("css") {
                "text/css"
            } else {
                "application/octet-stream"
            };
            (
                [(header::CONTENT_TYPE, HeaderValue::from_static(content_type))],
                bytes,
            )
                .into_response()
        }
        Err(_) => (
            [(
                header::CONTENT_TYPE,
                HeaderValue::from_static("text/html; charset=utf-8"),
            )],
            default_dashboard_html(),
        )
            .into_response(),
    }
}

fn default_dashboard_html() -> &'static str {
    r##"<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Air-Mesh Base Camp</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #0b1220; color: #e5edf7; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top right, #12304a, #0b1220 55%); }
    main { max-width: 1080px; margin: 0 auto; padding: 48px 24px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; flex-wrap: wrap; }
    h1 { margin: 0; font-size: clamp(2rem, 6vw, 4rem); letter-spacing: -0.05em; }
    p { color: #9eb1c7; line-height: 1.6; }
    .status { border: 1px solid #2dd4bf; color: #7ee7d7; border-radius: 999px; padding: 8px 12px; font-size: .85rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 32px; }
    .card { background: rgba(20, 33, 51, .84); border: 1px solid #263c56; border-radius: 18px; padding: 20px; min-height: 120px; }
    .label { color: #8da5be; font-size: .75rem; text-transform: uppercase; letter-spacing: .12em; }
    .value { margin-top: 14px; font-size: 1.8rem; font-weight: 700; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; color: #b8c9da; font-size: .82rem; }
    button { margin-top: 24px; border: 0; border-radius: 12px; padding: 12px 16px; background: #2dd4bf; color: #052323; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <header>
      <div><div class="label">Offline coordination console</div><h1>Air-Mesh Base Camp</h1><p>This dashboard reports only data accepted by this base camp. Empty states mean no records have been synchronized.</p></div>
      <div class="status">LOCAL SERVER ONLINE</div>
    </header>
    <section class="grid">
      <article class="card"><div class="label">Reports</div><div id="reports" class="value">Loading…</div><p>Stored reports available to the coordinator.</p></article>
      <article class="card"><div class="label">Prioritized actions</div><div id="insights" class="value">Loading…</div><p>Latest locally stored prioritization results.</p></article>
      <article class="card"><div class="label">Audit events</div><div id="audit" class="value">Loading…</div><p>Recorded base-camp and courier events.</p></article>
    </section>
    <button onclick="refresh()">Refresh coordinator data</button>
    <section class="card" style="margin-top:16px"><div class="label">Raw response summary</div><pre id="detail">Waiting for data…</pre></section>
  </main>
  <script>
    async function load(path) {
      try { const response = await fetch(path); if (!response.ok) throw new Error(response.status); return await response.json(); }
      catch (error) { return { unavailable: true, error: String(error) }; }
    }
    async function refresh() {
      const [reports, insights, audit] = await Promise.all([load('/reports'), load('/insights'), load('/audit')]);
      document.querySelector('#reports').textContent = Array.isArray(reports) ? reports.length : 'Unavailable';
      document.querySelector('#insights').textContent = Array.isArray(insights) ? insights.length : 'Unavailable';
      document.querySelector('#audit').textContent = Array.isArray(audit) ? audit.length : 'Unavailable';
      document.querySelector('#detail').textContent = JSON.stringify({ reports, insights, audit }, null, 2);
    }
    refresh();
  </script>
</body>
</html>"##
}

// A tiny local result alias avoids adding an error framework to the demo server.
mod anyhowless {
    pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;
}
