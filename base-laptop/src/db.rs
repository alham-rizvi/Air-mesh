use rusqlite::{params, Connection, Result as SqlResult};
use serde_json::Value;

use crate::models::{AuditLog, PrioritizedAction, Report};

pub fn init(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS reports (
           id TEXT PRIMARY KEY, shelter_id TEXT NOT NULL, timestamp TEXT NOT NULL,
           people_count INTEGER NOT NULL, needs TEXT NOT NULL, notes TEXT,
           severity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
           sync_status TEXT NOT NULL DEFAULT 'local', origin_device_id TEXT
         );
         CREATE TABLE IF NOT EXISTS audit_logs (
           id TEXT PRIMARY KEY, device_id TEXT, timestamp TEXT NOT NULL,
           action TEXT NOT NULL, details TEXT
         );
         CREATE TABLE IF NOT EXISTS insights (
           id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, data TEXT NOT NULL
         );",
    )
}

pub fn upsert_report(conn: &Connection, report: &Report) -> SqlResult<()> {
    let needs = report.needs.join(",");
    conn.execute(
        "INSERT INTO reports (id,shelter_id,timestamp,people_count,needs,notes,severity,status,sync_status,origin_device_id)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
         ON CONFLICT(id) DO UPDATE SET shelter_id=excluded.shelter_id,timestamp=excluded.timestamp,
         people_count=excluded.people_count,needs=excluded.needs,notes=excluded.notes,severity=excluded.severity,
         status=excluded.status,sync_status=excluded.sync_status,origin_device_id=excluded.origin_device_id",
        params![report.id, report.shelter_id, report.timestamp, report.people_count, needs, report.notes, report.severity, report.status, report.sync_status, report.origin_device_id],
    )?;
    Ok(())
}

pub fn upsert_audit(conn: &Connection, log: &AuditLog) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO audit_logs (id,device_id,timestamp,action,details) VALUES (?1,?2,?3,?4,?5)
         ON CONFLICT(id) DO UPDATE SET device_id=excluded.device_id,timestamp=excluded.timestamp,
         action=excluded.action,details=excluded.details",
        params![
            log.id,
            log.device_id,
            log.timestamp,
            log.action,
            log.details.to_string()
        ],
    )?;
    Ok(())
}

pub fn get_reports(conn: &Connection) -> SqlResult<Vec<Report>> {
    let mut stmt = conn.prepare("SELECT id,shelter_id,timestamp,people_count,needs,notes,severity,status,sync_status,origin_device_id FROM reports ORDER BY timestamp DESC")?;
    let rows = stmt.query_map([], |row| {
        let needs: String = row.get(4)?;
        Ok(Report {
            id: row.get(0)?,
            shelter_id: row.get(1)?,
            timestamp: row.get(2)?,
            people_count: row.get(3)?,
            needs: needs
                .split(',')
                .filter(|s| !s.is_empty())
                .map(String::from)
                .collect(),
            notes: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
            severity: row.get(6)?,
            status: row.get(7)?,
            sync_status: row.get(8)?,
            origin_device_id: row.get::<_, Option<String>>(9)?.unwrap_or_default(),
        })
    })?;
    rows.collect()
}

pub fn get_audit(conn: &Connection) -> SqlResult<Vec<AuditLog>> {
    let mut stmt = conn.prepare(
        "SELECT id,device_id,timestamp,action,details FROM audit_logs ORDER BY timestamp DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        let details: String = row
            .get::<_, Option<String>>(4)?
            .unwrap_or_else(|| "{}".into());
        Ok(AuditLog {
            id: row.get(0)?,
            device_id: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
            timestamp: row.get(2)?,
            action: row.get(3)?,
            details: serde_json::from_str(&details).unwrap_or(Value::Object(Default::default())),
        })
    })?;
    rows.collect()
}

pub fn store_insights(
    conn: &Connection,
    actions: &[PrioritizedAction],
    created_at: &str,
) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO insights (created_at,data) VALUES (?1,?2)",
        params![
            created_at,
            serde_json::to_string(actions).unwrap_or_else(|_| "[]".into())
        ],
    )?;
    Ok(())
}

pub fn latest_insights(conn: &Connection) -> SqlResult<Vec<PrioritizedAction>> {
    let data: Option<String> = conn
        .query_row(
            "SELECT data FROM insights ORDER BY id DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()?;
    Ok(data
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default())
}

trait OptionalRow<T> {
    fn optional(self) -> SqlResult<Option<T>>;
}
impl<T> OptionalRow<T> for SqlResult<T> {
    fn optional(self) -> SqlResult<Option<T>> {
        match self {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(error) => Err(error),
        }
    }
}
