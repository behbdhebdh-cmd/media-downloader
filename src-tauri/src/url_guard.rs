use url::Url;

use crate::error::AppError;

pub fn parse_media_url(raw: &str) -> Result<String, AppError> {
    let raw = raw.trim();
    if raw.is_empty() {
        return Err(AppError::msg("Paste a link."));
    }
    let parsed = Url::parse(raw).map_err(|_| AppError::msg("Invalid link."))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err(AppError::msg("Only http and https links are allowed."));
    }
    if parsed.host_str().is_none() {
        return Err(AppError::msg("Invalid link."));
    }
    Ok(parsed.as_str().to_string())
}
