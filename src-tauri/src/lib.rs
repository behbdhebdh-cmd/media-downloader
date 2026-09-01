mod error;
mod ffmpeg;
mod formats;
mod paths;
mod progress;
mod url_guard;
mod ytdlp;

use formats::{Container, Preset};
use tauri::AppHandle;

use error::AppError;

#[tauri::command]
async fn resolve_link(app: AppHandle, url: String) -> Result<ytdlp::ResolveResult, AppError> {
    let url = url_guard::parse_media_url(&url)?;
    ytdlp::resolve_link(&app, &url).await
}

#[tauri::command]
async fn download(
    app: AppHandle,
    url: String,
    container: Container,
    preset: Preset,
) -> Result<ytdlp::DownloadResult, AppError> {
    let url = url_guard::parse_media_url(&url)?;
    if formats::needs_ffmpeg(container, preset) && !ffmpeg::present(&app) {
        let ensured = ffmpeg::ensure_ffmpeg(&app).await?;
        if !ensured.ok {
            return Err(AppError::msg(
                "ffmpeg is missing. MP4 audio and MP3 need ffmpeg.",
            ));
        }
    }
    ytdlp::download(&app, &url, container, preset).await
}

#[tauri::command]
async fn runtime_status(app: AppHandle) -> ytdlp::RuntimeStatus {
    ytdlp::runtime_status(&app).await
}

#[tauri::command]
async fn ensure_ffmpeg(app: AppHandle) -> Result<ffmpeg::EnsureResult, AppError> {
    ffmpeg::ensure_ffmpeg(&app).await
}

#[tauri::command]
async fn download_dir_info(app: AppHandle) -> Result<paths::DownloadDirInfo, AppError> {
    paths::download_dir_info(&app)
}

#[tauri::command]
async fn pick_download_dir(app: AppHandle) -> Result<paths::DownloadDirInfo, AppError> {
    paths::pick_download_dir(app).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            resolve_link,
            download,
            runtime_status,
            ensure_ffmpeg,
            download_dir_info,
            pick_download_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
