use std::path::{Path, PathBuf};
use std::process::Stdio;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tokio::io::{AsyncRead, AsyncReadExt};
use tokio::process::Command as TokioCommand;
use tokio::sync::mpsc;

use crate::error::{self, AppError};
use crate::ffmpeg;
use crate::formats::{self, Container, Preset};
use crate::paths;
use crate::progress;

pub struct RunOutput {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Serialize)]
pub struct ResolveResult {
    pub title: String,
    pub extractor: String,
    pub duration_sec: Option<u64>,
    pub thumbnail: Option<String>,
    pub formats_summary: String,
}

#[derive(Serialize)]
pub struct DownloadResult {
    pub path: String,
    pub bytes: Option<u64>,
}

#[derive(Serialize)]
pub struct RuntimeStatus {
    pub ytdlp: &'static str,
    pub qjs: &'static str,
    pub ffmpeg: &'static str,
    pub ffprobe: &'static str,
    pub ffmpeg_path: Option<String>,
    pub qjs_path: Option<String>,
}

#[derive(Deserialize)]
struct YtdlpDump {
    title: Option<String>,
    extractor: Option<String>,
    extractor_key: Option<String>,
    duration: Option<f64>,
    thumbnail: Option<String>,
    formats: Option<Vec<Value>>,
}

pub async fn runtime_status(app: &AppHandle) -> RuntimeStatus {
    let ytdlp = if paths::ytdlp_override(app).is_some() || paths::bundled_sidecar("yt-dlp").is_ok() {
        "ok"
    } else {
        "missing"
    };
    let qjs_path = paths::qjs_path().ok();
    let qjs = if qjs_path.as_ref().is_some_and(|p| p.is_file()) {
        "ok"
    } else {
        "missing"
    };
    let ffmpeg_dir = paths::ffmpeg_dir(app).ok();
    let ffmpeg_exe = ffmpeg_dir.as_ref().map(|d| d.join(paths::sidecar_filename("ffmpeg")));
    let ffprobe_exe = ffmpeg_dir.as_ref().map(|d| d.join(paths::sidecar_filename("ffprobe")));
    let ffmpeg = ffmpeg_exe
        .as_ref()
        .map(|p| paths::status_label(p))
        .unwrap_or("missing");
    let ffprobe = ffprobe_exe
        .as_ref()
        .map(|p| paths::status_label(p))
        .unwrap_or("missing");
    RuntimeStatus {
        ytdlp,
        qjs,
        ffmpeg,
        ffprobe,
        ffmpeg_path: ffmpeg_exe
            .filter(|p| p.is_file())
            .map(|p| p.to_string_lossy().into_owned()),
        qjs_path: qjs_path.map(|p| p.to_string_lossy().into_owned()),
    }
}

pub async fn resolve_link(app: &AppHandle, url: &str) -> Result<ResolveResult, AppError> {
    let qjs = paths::qjs_path()?;
    let mut args = base_args(&qjs, None);
    args.extend([
        "--dump-single-json".into(),
        "--skip-download".into(),
        "--".into(),
        url.to_string(),
    ]);

    let output = run_ytdlp(app, &args, |_| {}).await?;
    if output.code != 0 {
        return Err(error::from_ytdlp(&output.stderr, &output.stdout));
    }
    let json = extract_json(&output.stdout)?;
    let dump: YtdlpDump = serde_json::from_value(json)
        .map_err(|_| AppError::msg("Could not read metadata."))?;

    Ok(ResolveResult {
        title: dump
            .title
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| "Untitled".into()),
        extractor: dump
            .extractor_key
            .or(dump.extractor)
            .unwrap_or_else(|| "unknown".into()),
        duration_sec: dump.duration.map(|d| d.max(0.0).round() as u64),
        thumbnail: dump.thumbnail,
        formats_summary: summarize_formats(dump.formats.as_deref()),
    })
}

pub async fn download(
    app: &AppHandle,
    url: &str,
    container: Container,
    preset: Preset,
) -> Result<DownloadResult, AppError> {
    let qjs = paths::qjs_path()?;
    let downloads = paths::download_dir(app)?;
    std::fs::create_dir_all(&downloads)
        .map_err(|_| AppError::msg("Downloads folder not found."))?;

    let ext = container.extension();
    let tmp_stem = format!(
        "mdl-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    let dest = downloads.join(format!("{tmp_stem}.{ext}"));
    let out_tmpl = downloads.join(format!("{tmp_stem}.%(ext)s"));

    let ffmpeg_location = paths::ffmpeg_dir(app).ok().filter(|dir| {
        dir.join(paths::sidecar_filename("ffmpeg")).is_file()
            && dir.join(paths::sidecar_filename("ffprobe")).is_file()
    });

    let mut args = base_args(&qjs, ffmpeg_location.as_deref());
    args.extend(formats::download_args(container, preset)?);
    args.extend([
        "--windows-filenames".into(),
        "--newline".into(),
        "--progress".into(),
        "--progress-delta".into(),
        "0.5".into(),
        "--progress-template".into(),
        "download:MDL:%(progress._percent_str)s".into(),
        "--progress-template".into(),
        "postprocess:MDLPOST:%(progress._percent_str)s".into(),
        "--no-mtime".into(),
        "--no-simulate".into(),
        "--print".into(),
        "after_move:TITLE=%(title)s".into(),
        "--print".into(),
        "after_move:PATH=%(filepath)s".into(),
        "--print".into(),
        "after_video:TITLE=%(title)s".into(),
        "--print".into(),
        "after_video:PATH=%(filepath)s".into(),
        "-o".into(),
        out_tmpl.to_string_lossy().into_owned(),
        "--".into(),
        url.to_string(),
    ]);

    progress::emit(app, "download", Some(0.0), "Downloading …");

    let mut tracker = progress::DownloadProgress::new(container == Container::Mp3);
    let output = run_ytdlp(app, &args, |line| {
        if let Some((percent, message)) = tracker.on_line(line) {
            progress::emit(app, "download", Some(percent), &message);
        }
    })
    .await?;

    if output.code != 0 {
        return Err(error::from_ytdlp(&output.stderr, &output.stdout));
    }

    let mut path = finalize_download(&output.stdout, &dest, &downloads, ext)?;
    if container == Container::Mp4 && !ffmpeg::file_has_audio(app, &path).await? {
        let _ = std::fs::remove_file(&path);
        return Err(AppError::msg("The file has no audio."));
    }

    // Windows-compatibility guard: if the mp4 is not H.264 (HEVC/AV1 would
    // require the paid Microsoft codec extension), transcode it in place.
    // Best-effort — if the probe or transcode fails, keep the original file.
    if container == Container::Mp4 {
        if let Ok(Some(codec)) = ffmpeg::video_codec(app, &path).await {
            let is_h264 = codec == "h264";
            if !is_h264 && ffmpeg::present(app) {
                match ffmpeg::transcode_to_h264(app, &path).await {
                    Ok(tmp) => {
                        let final_path = paths::unique_output(
                            &downloads,
                            &path.file_stem()
                                .map(|s| s.to_string_lossy().into_owned())
                                .unwrap_or_else(|| "download".into()),
                            "mp4",
                        );
                        match std::fs::rename(&tmp, &final_path) {
                            Ok(()) => {
                                let _ = std::fs::remove_file(&path);
                                path = final_path;
                            }
                            Err(_) => {
                                // rename can fail across volumes; fall back to copy
                                if std::fs::copy(&tmp, &final_path).is_ok() {
                                    let _ = std::fs::remove_file(&tmp);
                                    let _ = std::fs::remove_file(&path);
                                    path = final_path;
                                } else {
                                    let _ = std::fs::remove_file(&tmp);
                                    // keep original `path` (non-H.264 but playable
                                    // with the right codec installed)
                                }
                            }
                        }
                    }
                    Err(_) => {
                        // Transcode failed — keep the original file as-is.
                    }
                }
            }
        }
    }

    let bytes = std::fs::metadata(&path).ok().map(|m| m.len());
    progress::emit(app, "download", Some(100.0), "100 %");
    Ok(DownloadResult {
        path: path.to_string_lossy().into_owned(),
        bytes,
    })
}

fn base_args(qjs: &Path, ffmpeg_dir: Option<&Path>) -> Vec<String> {
    let mut args = vec![
        "--ignore-config".into(),
        "--no-playlist".into(),
        "--no-warnings".into(),
        "--no-js-runtimes".into(),
        "--js-runtimes".into(),
        format!("quickjs:{}", qjs.display()),
        "--encoding".into(),
        "utf-8".into(),
        "--color".into(),
        "never".into(),
        "--socket-timeout".into(),
        "30".into(),
    ];
    if let Some(dir) = ffmpeg_dir {
        args.push("--ffmpeg-location".into());
        args.push(dir.to_string_lossy().into_owned());
    }
    args
}

async fn run_ytdlp(
    app: &AppHandle,
    args: &[String],
    on_stderr_line: impl FnMut(&str),
) -> Result<RunOutput, AppError> {
    // Spawn the bundled binary next to the app exe with an argv array.
    // Do not use plugin-shell sidecar() here: it joins `binaries/<name>` onto
    // the exe dir, while Tauri copies sidecars as `<exe-dir>/yt-dlp.exe`.
    run_external(&paths::ytdlp_bin(app)?, args, on_stderr_line).await
}

async fn run_external(
    binary: &Path,
    args: &[String],
    mut on_line: impl FnMut(&str),
) -> Result<RunOutput, AppError> {
    let mut cmd = TokioCommand::new(binary);
    cmd.args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null())
        .env("PYTHONUNBUFFERED", "1")
        .kill_on_drop(true);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn().map_err(|err| {
        eprintln!("yt-dlp spawn {}: {err}", binary.display());
        AppError::msg("Could not start yt-dlp.")
    })?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| AppError::msg("Could not start yt-dlp."))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| AppError::msg("Could not start yt-dlp."))?;

    let (tx, mut rx) = mpsc::channel::<(bool, String)>(64);
    let tx_err = tx.clone();
    let stdout_task = tauri::async_runtime::spawn(async move { pump_lines(stdout, true, tx).await });
    let stderr_task =
        tauri::async_runtime::spawn(async move { pump_lines(stderr, false, tx_err).await });

    while let Some((_, line)) = rx.recv().await {
        on_line(&line);
    }

    let stdout_buf = stdout_task.await.unwrap_or_default();
    let stderr_buf = stderr_task.await.unwrap_or_default();
    let status = child
        .wait()
        .await
        .map_err(|_| AppError::msg("Could not start yt-dlp."))?;

    Ok(RunOutput {
        code: status.code().unwrap_or(1),
        stdout: stdout_buf,
        stderr: stderr_buf,
    })
}

async fn pump_lines<R>(reader: R, is_stdout: bool, tx: mpsc::Sender<(bool, String)>) -> String
where
    R: AsyncRead + Unpin,
{
    let mut collected = String::new();
    let mut pending = Vec::new();
    let mut buf = [0u8; 8192];
    let mut reader = reader;
    loop {
        match reader.read(&mut buf).await {
            Ok(0) => break,
            Ok(n) => pending.extend_from_slice(&buf[..n]),
            Err(_) => break,
        }
        drain_pending(&mut pending, &mut collected, is_stdout, &tx).await;
    }
    if !pending.is_empty() {
        if let Ok(text) = std::str::from_utf8(&pending) {
            let line = text.trim_end_matches(['\r', '\n']);
            if !line.is_empty() {
                collected.push_str(line);
                collected.push('\n');
                let _ = tx.send((is_stdout, line.to_string())).await;
            }
        }
    }
    collected
}

async fn drain_pending(
    pending: &mut Vec<u8>,
    collected: &mut String,
    is_stdout: bool,
    tx: &mpsc::Sender<(bool, String)>,
) {
    loop {
        let pos = pending.iter().position(|b| *b == b'\n' || *b == b'\r');
        let Some(i) = pos else {
            break;
        };
        let line_bytes = pending.drain(..=i).collect::<Vec<_>>();
        let sep = *line_bytes.last().unwrap_or(&b'\n');
        if sep == b'\r' && pending.first() == Some(&b'\n') {
            pending.remove(0);
        }
        let line = String::from_utf8_lossy(&line_bytes[..line_bytes.len().saturating_sub(1)]);
        let line = line.trim_end_matches('\r');
        if line.is_empty() {
            continue;
        }
        collected.push_str(line);
        collected.push('\n');
        if tx.send((is_stdout, line.to_string())).await.is_err() {
            break;
        }
    }
}

fn extract_json(stdout: &str) -> Result<Value, AppError> {
    let start = stdout
        .find('{')
        .ok_or_else(|| AppError::msg("Could not read metadata."))?;
    let end = stdout
        .rfind('}')
        .ok_or_else(|| AppError::msg("Could not read metadata."))?;
    serde_json::from_str(&stdout[start..=end])
        .map_err(|_| AppError::msg("Could not read metadata."))
}

fn summarize_formats(formats: Option<&[Value]>) -> String {
    let mut max_h = 0u64;
    let mut audio = false;
    if let Some(items) = formats {
        for format in items {
            if let Some(height) = format.get("height").and_then(|h| h.as_u64()) {
                max_h = max_h.max(height);
            }
            let acodec = format
                .get("acodec")
                .and_then(|v| v.as_str())
                .unwrap_or("none");
            if acodec != "none" {
                audio = true;
            }
        }
    }
    let video = if max_h > 0 {
        format!("Video up to {max_h}p")
    } else {
        "Video".into()
    };
    let audio = if audio {
        "Audio available"
    } else {
        "no audio"
    };
    format!("{video}, {audio}")
}

fn finalize_download(
    stdout: &str,
    fallback: &Path,
    downloads: &Path,
    ext: &str,
) -> Result<PathBuf, AppError> {
    let mut title: Option<String> = None;
    let mut written: Option<PathBuf> = None;
    for line in stdout.lines() {
        let line = line.trim();
        if let Some(rest) = line.strip_prefix("TITLE=") {
            title = Some(rest.to_string());
        } else if let Some(rest) = line.strip_prefix("PATH=") {
            let rest = rest.trim().trim_matches('"');
            if rest.is_empty() || rest.eq_ignore_ascii_case("NA") {
                continue;
            }
            let path = PathBuf::from(rest);
            if path.is_file() {
                written = Some(path);
            }
        }
    }
    let written = match written {
        Some(path) => path,
        None => match find_written(downloads, fallback) {
            Some(path) => path,
            None => return Err(AppError::msg("The file was not written.")),
        },
    };

    let actual_ext = written
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or(ext);
    let stem = paths::sanitize_filename(title.as_deref().unwrap_or("download"));
    let target = paths::unique_output(downloads, &stem, actual_ext);
    if written == target {
        return Ok(written);
    }
    match std::fs::rename(&written, &target) {
        Ok(()) => Ok(target),
        Err(_) => {
            if let Err(err) = std::fs::copy(&written, &target) {
                eprintln!("rename/copy failed: {err}");
                Ok(written)
            } else {
                let _ = std::fs::remove_file(&written);
                Ok(target)
            }
        }
    }
}

fn find_written(dir: &Path, fallback: &Path) -> Option<PathBuf> {
    if fallback.is_file() {
        return Some(fallback.to_path_buf());
    }
    let stem = fallback.file_stem()?.to_string_lossy().into_owned();
    let mut best: Option<(u64, PathBuf)> = None;
    for entry in std::fs::read_dir(dir).ok()? {
        let entry = entry.ok()?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if !name.starts_with(&stem) {
            continue;
        }
        if name.ends_with(".part") || name.ends_with(".ytdl") {
            continue;
        }
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let len = entry.metadata().ok()?.len();
        if best.as_ref().is_none_or(|(current, _)| len > *current) {
            best = Some((len, path));
        }
    }
    best.map(|(_, path)| path)
}
