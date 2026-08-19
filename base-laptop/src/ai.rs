use crate::models::{PrioritizedAction, Report};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
}

pub async fn prioritize_reports(
    reports: &[Report],
    model: &str,
    mock: bool,
) -> Vec<PrioritizedAction> {
    if mock {
        return fallback_rank(reports);
    }
    let report_json = serde_json::to_string(reports).unwrap_or_default();
    let prompt = format!(
        r#"You are a disaster-response coordinator. Analyze these reports by severity, people_count, needs, and timeliness. Return ONLY a JSON array of objects with keys rank, shelter_id, reason, suggested_action. Example: [{{"rank":1,"shelter_id":"SH-001","reason":"High severity and medical need","suggested_action":"Send medical supplies immediately"}}]. Reports: {report_json}"#
    );
    let body = serde_json::json!({"model": model, "prompt": prompt, "stream": false});
    let client = reqwest::Client::new();
    let response = match client
        .post("http://localhost:11434/api/generate")
        .json(&body)
        .send()
        .await
    {
        Ok(value) => value,
        Err(error) => {
            eprintln!("Ollama unavailable: {error}");
            return fallback_rank(reports);
        }
    };
    let payload: OllamaResponse = match response.json().await {
        Ok(value) => value,
        Err(error) => {
            eprintln!("Invalid Ollama response: {error}");
            return fallback_rank(reports);
        }
    };
    let cleaned = payload
        .response
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    match serde_json::from_str(cleaned) {
        Ok(actions) => actions,
        Err(error) => {
            eprintln!("Could not parse Ollama JSON: {error}");
            fallback_rank(reports)
        }
    }
}

pub fn fallback_rank(reports: &[Report]) -> Vec<PrioritizedAction> {
    let mut sorted = reports.to_vec();
    sorted.sort_by(|a, b| {
        severity_score(&b.severity)
            .cmp(&severity_score(&a.severity))
            .then_with(|| b.people_count.cmp(&a.people_count))
            .then_with(|| b.timestamp.cmp(&a.timestamp))
    });
    sorted
        .into_iter()
        .enumerate()
        .map(|(index, report)| {
            let action = if report
                .needs
                .iter()
                .any(|need| need.eq_ignore_ascii_case("medical"))
            {
                "Send medical supplies immediately"
            } else if report
                .needs
                .iter()
                .any(|need| need.eq_ignore_ascii_case("water"))
            {
                "Dispatch water supply"
            } else {
                "Review shelter needs and assign a courier"
            };
            PrioritizedAction {
                rank: (index + 1) as u32,
                shelter_id: report.shelter_id,
                reason: format!(
                    "{} severity, {} people waiting",
                    report.severity, report.people_count
                ),
                suggested_action: action.into(),
            }
        })
        .collect()
}

fn severity_score(value: &str) -> u8 {
    match value.to_ascii_lowercase().as_str() {
        "high" => 3,
        "medium" => 2,
        _ => 1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn fallback_prioritizes_high_severity() {
        let reports = vec![
            Report {
                id: "1".into(),
                shelter_id: "LOW".into(),
                timestamp: "2025".into(),
                people_count: 100,
                needs: vec![],
                notes: String::new(),
                severity: "low".into(),
                status: "active".into(),
                sync_status: "local".into(),
                origin_device_id: "d".into(),
            },
            Report {
                id: "2".into(),
                shelter_id: "HIGH".into(),
                timestamp: "2025".into(),
                people_count: 1,
                needs: vec![],
                notes: String::new(),
                severity: "high".into(),
                status: "active".into(),
                sync_status: "local".into(),
                origin_device_id: "d".into(),
            },
        ];
        assert_eq!(fallback_rank(&reports)[0].shelter_id, "HIGH");
    }
}
