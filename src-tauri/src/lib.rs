mod error;
mod ffmpeg;
mod formats;
mod paths;
mod progress;
mod url_guard;
mod ytdlp;

use formats::{Container, Preset};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};

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

#[tauri::command]
async fn open_download_dir(app: AppHandle) -> Result<(), AppError> {
    paths::open_download_dir(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Open MediaDownloader", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &sep, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("MediaDownloader")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            let is_minimized = window.is_minimized().unwrap_or(false);
                            if is_visible && !is_minimized {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            } else {
                tray_builder = tray_builder.icon(tauri::include_image!("icons/32x32.png"));
            }

            let tray = tray_builder.build(app)?;
            app.manage(tray);

            // Ensure window is shown & focused on startup
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            resolve_link,
            download,
            runtime_status,
            ensure_ffmpeg,
            download_dir_info,
            pick_download_dir,
            open_download_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
