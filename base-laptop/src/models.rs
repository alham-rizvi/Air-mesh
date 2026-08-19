use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    pub id: String,
    pub shelter_id: String,
    pub timestamp: String,
    pub people_count: u32,
    pub needs: Vec<String>,
    pub notes: String,
    pub severity: String,
    #[serde(default = "default_active")]
    pub status: String,
    #[serde(default = "default_local")]
    pub sync_status: String,
    pub origin_device_id: String,
}

fn default_active() -> String {
    "active".to_string()
}
fn default_local() -> String {
    "local".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub device_id: String,
    pub timestamp: String,
    pub action: String,
    pub details: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrioritizedAction {
    pub rank: u32,
    pub shelter_id: String,
    pub reason: String,
    pub suggested_action: String,
}

#[derive(Debug, Deserialize)]
pub struct SyncRequest {
    #[serde(default)]
    pub reports: Vec<Report>,
    #[serde(default)]
    pub audit_logs: Vec<AuditLog>,
}

#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub received: usize,
}
