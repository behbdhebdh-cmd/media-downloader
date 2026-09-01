use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

use crate::error::AppError;

#[derive(Serialize)]
pub struct DownloadDirInfo {
    pub name: String,
}

pub fn app_data(app: &AppHandle) -> Result<PathBuf, AppError> {
    app.path()
        .app_data_dir()
        .map_err(|_| AppError::msg("App data folder not found."))
}

fn download_dir_store(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(app_data(app)?.join("download-dir.txt"))
}

fn default_download_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    app.path()
        .download_dir()
        .map_err(|_| AppError::msg("Downloads folder not found."))
}

fn folder_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| "Folder".into())
}

pub fn download_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    if let Ok(stored) = std::fs::read_to_string(download_dir_store(app)?) {
        let path = PathBuf::from(stored.trim());
        if path.is_dir() {
            return Ok(strip_verbatim(path));
        }
    }
    default_download_dir(app).map(strip_verbatim)
}

pub fn download_dir_info(app: &AppHandle) -> Result<DownloadDirInfo, AppError> {
    Ok(DownloadDirInfo {
        name: folder_name(&download_dir(app)?),
    })
}

fn persist_download_dir(app: &AppHandle, path: &Path) -> Result<(), AppError> {
    let data = app_data(app)?;
    std::fs::create_dir_all(&data)
        .map_err(|_| AppError::msg("App data folder not found."))?;
    std::fs::write(download_dir_store(app)?, path.to_string_lossy().as_bytes())
        .map_err(|_| AppError::msg("Could not save the folder."))?;
    Ok(())
}

pub async fn pick_download_dir(app: AppHandle) -> Result<DownloadDirInfo, AppError> {
    let current = download_dir(&app).ok();
    let (tx, rx) = tokio::sync::oneshot::channel();
    let mut dialog = app.dialog().file();
    dialog = dialog.set_title("Choose folder");
    if let Some(dir) = current.as_ref().filter(|path| path.is_dir()) {
        dialog = dialog.set_directory(dir);
    }
    dialog.pick_folder(move |folder| {
        let path = folder.and_then(|file| file.into_path().ok());
        let _ = tx.send(path);
    });
    match rx.await.unwrap_or(None) {
        Some(path) if path.is_dir() => {
            persist_download_dir(&app, &path)?;
            Ok(DownloadDirInfo {
                name: folder_name(&path),
            })
        }
        _ => download_dir_info(&app),
    }
}

pub fn ffmpeg_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(app_data(app)?.join("ffmpeg"))
}

pub fn ytdlp_override(app: &AppHandle) -> Option<PathBuf> {
    let path = app_data(app).ok()?.join("bin").join(sidecar_filename("yt-dlp"));
    path.is_file().then_some(path)
}

pub fn sidecar_filename(name: &str) -> String {
    if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}

pub fn bundled_sidecar(name: &str) -> Result<PathBuf, AppError> {
    let exe = std::env::current_exe()
        .map_err(|_| AppError::msg("App path not found."))?;
    let dir = exe
        .parent()
        .ok_or_else(|| AppError::msg("App path not found."))?;
    let filename = sidecar_filename(name);
    for candidate in [
        dir.join(&filename),
        dir.join("binaries").join(&filename),
    ] {
        if candidate.is_file() {
            return Ok(strip_verbatim(candidate));
        }
    }
    Err(AppError::msg(format!(
        "{name} is missing. Run npm run fetch-sidecars first."
    )))
}

pub fn ytdlp_bin(app: &AppHandle) -> Result<PathBuf, AppError> {
    if let Some(override_path) = ytdlp_override(app) {
        return Ok(strip_verbatim(override_path));
    }
    bundled_sidecar("yt-dlp")
}

pub fn qjs_path() -> Result<PathBuf, AppError> {
    bundled_sidecar("qjs")
}

fn strip_verbatim(path: PathBuf) -> PathBuf {
    let raw = path.to_string_lossy();
    for prefix in [r"\\?\", r"//?/"] {
        if let Some(stripped) = raw.strip_prefix(prefix) {
            return PathBuf::from(stripped);
        }
    }
    path
}

pub fn status_label(path: &Path) -> &'static str {
    if path.is_file() {
        "ok"
    } else {
        "missing"
    }
}

pub fn sanitize_filename(title: &str) -> String {
    let mapped: String = title
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            c if c.is_control() => '-',
            c => c,
        })
        .collect();
    let trimmed = mapped.trim().trim_matches('.').trim();
    let mut stem = if trimmed.is_empty() {
        "download".to_string()
    } else {
        trimmed.to_string()
    };
    if stem.chars().count() > 120 {
        stem = stem.chars().take(120).collect();
        stem = stem.trim().trim_matches('.').trim().to_string();
        if stem.is_empty() {
            stem = "download".into();
        }
    }
    stem
}

pub fn unique_output(dir: &Path, stem: &str, ext: &str) -> PathBuf {
    let first = dir.join(format!("{stem}.{ext}"));
    if !first.exists() {
        return first;
    }
    for i in 1..1000 {
        let candidate = dir.join(format!("{stem}-{i}.{ext}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    dir.join(format!("{stem}-new.{ext}"))
}
