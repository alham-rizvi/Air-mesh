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

async fn static_dashboard(State(state): State<AppState>, uri: Uri) -> Response {
    let request_path = uri.path().trim_start_matches('/');
    if request_path.starts_with("reports")
        || request_path.starts_with("insights")
        || request_path.starts_with("audit")
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
        Err(_) => (StatusCode::NOT_FOUND, "Dashboard not built yet").into_response(),
    }
}

// A tiny local result alias avoids adding an error framework to the demo server.
mod anyhowless {
    pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;
}
