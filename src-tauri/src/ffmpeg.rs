use std::fs::File;
use std::io::copy;
use std::path::{Path, PathBuf};
use std::process::Stdio;

use futures_util::StreamExt;
use serde::Serialize;
use tauri::AppHandle;
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command as TokioCommand;

use crate::error::AppError;
use crate::paths;
use crate::progress;

const FFMPEG_ZIP: &str =
    "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";

#[derive(Serialize)]
pub struct EnsureResult {
    pub ok: bool,
    pub path: String,
}

pub fn present(app: &AppHandle) -> bool {
    match paths::ffmpeg_dir(app) {
        Ok(dir) => {
            dir.join(paths::sidecar_filename("ffmpeg")).is_file()
                && dir.join(paths::sidecar_filename("ffprobe")).is_file()
        }
        Err(_) => false,
    }
}

pub async fn ensure_ffmpeg(app: &AppHandle) -> Result<EnsureResult, AppError> {
    let dir = paths::ffmpeg_dir(app)?;
    let ffmpeg = dir.join(paths::sidecar_filename("ffmpeg"));
    let ffprobe = dir.join(paths::sidecar_filename("ffprobe"));
    if ffmpeg.is_file() && ffprobe.is_file() {
        return Ok(EnsureResult {
            ok: true,
            path: dir.to_string_lossy().into_owned(),
        });
    }

    std::fs::create_dir_all(&dir).map_err(|_| AppError::msg("Could not create the ffmpeg folder."))?;
    progress::emit(app, "ffmpeg", Some(0.0), "Downloading ffmpeg …");

    let zip_path = dir.join("ffmpeg-download.zip");
    if zip_path.exists() {
        let _ = std::fs::remove_file(&zip_path);
    }

    if let Err(err) = download_zip(app, &zip_path).await {
        let _ = std::fs::remove_file(&zip_path);
        return Err(err);
    }

    let extract_dir = dir.clone();
    let zip_for_extract = zip_path.clone();
    let extracted = tauri::async_runtime::spawn_blocking(move || extract_binaries(&zip_for_extract, &extract_dir))
        .await
        .map_err(|_| AppError::msg("Could not extract ffmpeg."))?;

    let _ = std::fs::remove_file(&zip_path);

    if let Err(err) = extracted {
        return Err(err);
    }

    if !ffmpeg.is_file() || !ffprobe.is_file() {
        return Err(AppError::msg(
            "ffmpeg is missing. MP4 audio and MP3 need ffmpeg.",
        ));
    }

    progress::emit(app, "ffmpeg", Some(100.0), "Downloading ffmpeg …");
    Ok(EnsureResult {
        ok: true,
        path: dir.to_string_lossy().into_owned(),
    })
}

async fn download_zip(app: &AppHandle, dest: &Path) -> Result<(), AppError> {
    let client = reqwest::Client::builder()
        .user_agent("MediaDownloader/0.1")
        .connect_timeout(std::time::Duration::from_secs(30))
        .timeout(std::time::Duration::from_secs(60 * 30))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|_| AppError::msg("Could not download ffmpeg."))?;

    let response = client
        .get(FFMPEG_ZIP)
        .send()
        .await
        .map_err(|_| AppError::msg("Could not download ffmpeg."))?;

    if !response.status().is_success() {
        return Err(AppError::msg("Could not download ffmpeg."));
    }

    let total = response.content_length();
    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|_| AppError::msg("Could not save ffmpeg."))?;
    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_pct: i32 = -1;
    let mut magic: Vec<u8> = Vec::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| AppError::msg("ffmpeg download interrupted."))?;
        if magic.len() < 4 {
            magic.extend_from_slice(&chunk);
        }
        downloaded += chunk.len() as u64;
        file.write_all(&chunk)
            .await
            .map_err(|_| AppError::msg("Could not save ffmpeg."))?;
        if let Some(total) = total {
            let pct = ((downloaded as f32 / total as f32) * 100.0).clamp(0.0, 100.0);
            let rounded = pct.floor() as i32;
            if rounded != last_pct {
                last_pct = rounded;
                progress::emit(app, "ffmpeg", Some(pct), "Downloading ffmpeg …");
            }
        }
    }

    file.flush()
        .await
        .map_err(|_| AppError::msg("Could not save ffmpeg."))?;

    if magic.len() < 4 || magic[0] != b'P' || magic[1] != b'K' {
        return Err(AppError::msg("Could not download ffmpeg."));
    }
    Ok(())
}

fn extract_binaries(zip_path: &Path, dest: &Path) -> Result<(), AppError> {
    let file = File::open(zip_path).map_err(|_| AppError::msg("Could not extract ffmpeg."))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|_| AppError::msg("Could not extract ffmpeg."))?;

    let mut found_ffmpeg = false;
    let mut found_ffprobe = false;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|_| AppError::msg("Could not extract ffmpeg."))?;
        if !entry.is_file() {
            continue;
        }
        let name = Path::new(entry.name())
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();
        let lower = name.to_ascii_lowercase();
        if lower != "ffmpeg.exe" && lower != "ffprobe.exe" && lower != "ffmpeg" && lower != "ffprobe"
        {
            continue;
        }
        let out_path = dest.join(&name);
        let mut out = File::create(&out_path)
            .map_err(|_| AppError::msg("Could not extract ffmpeg."))?;
        copy(&mut entry, &mut out).map_err(|_| AppError::msg("Could not extract ffmpeg."))?;
        if lower.starts_with("ffmpeg") {
            found_ffmpeg = true;
        }
        if lower.starts_with("ffprobe") {
            found_ffprobe = true;
        }
    }

    if !found_ffmpeg || !found_ffprobe {
        return Err(AppError::msg(
            "ffmpeg is missing. MP4 audio and MP3 need ffmpeg.",
        ));
    }
    Ok(())
}

/// Probe the first video stream's codec name (e.g. "h264", "hevc", "av1").
/// Returns Ok(None) when ffprobe is missing or the probe fails — callers must
/// treat that as "cannot verify" and skip any codec-dependent postprocess.
pub async fn video_codec(app: &AppHandle, media: &Path) -> Result<Option<String>, AppError> {
    let ffprobe = paths::ffmpeg_dir(app)?.join(paths::sidecar_filename("ffprobe"));
    if !ffprobe.is_file() {
        return Ok(None);
    }

    let media_arg = media.to_string_lossy().into_owned();
    let mut cmd = TokioCommand::new(&ffprobe);
    cmd.args([
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name",
        "-of",
        "csv=p=0",
        &media_arg,
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::null())
    .stdin(Stdio::null())
    .kill_on_drop(true);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(_) => return Ok(None),
    };
    let mut stdout = String::new();
    if let Some(pipe) = child.stdout.take() {
        let mut reader = BufReader::new(pipe);
        let _ = reader.read_to_string(&mut stdout).await;
    }
    let _ = child.wait().await;
    let name = stdout.trim().to_string();
    Ok(if name.is_empty() { None } else { Some(name) })
}

/// Transcode a video in place to H.264/AAC mp4 (max-compatibility profile).
/// Reports progress via the "postprocess" phase. On any failure the original
/// file is left untouched and an Err is returned — callers decide whether to
/// keep the original or fail the download.
pub async fn transcode_to_h264(
    app: &AppHandle,
    src: &Path,
) -> Result<PathBuf, AppError> {
    let dir = paths::ffmpeg_dir(app)?;
    let ffmpeg = dir.join(paths::sidecar_filename("ffmpeg"));
    if !ffmpeg.is_file() {
        return Err(AppError::msg("ffmpeg is missing."));
    }

    let tmp = src.with_extension("h264-transcode.mp4");
    let src_arg = src.to_string_lossy().into_owned();
    let tmp_arg = tmp.to_string_lossy().into_owned();

    progress::emit(app, "postprocess", Some(0.0), "Making Windows-compatible (H.264) …");

    let mut cmd = TokioCommand::new(&ffmpeg);
    cmd.args([
        "-y",
        "-i",
        &src_arg,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-progress",
        "pipe:1",
        "-nostats",
        &tmp_arg,
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::null())
    .stdin(Stdio::null())
    .kill_on_drop(true);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd
        .spawn()
        .map_err(|_| AppError::msg("Could not start ffmpeg transcode."))?;

    // Pump ffmpeg's -progress output (out_time_ms=...) into a rough percent.
    if let Some(pipe) = child.stdout.take() {
        let mut reader = BufReader::new(pipe);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) | Err(_) => break,
                Ok(_) => {
                    if let Some(rest) = line.strip_prefix("out_time_ms=") {
                        // out_time_ms is actually microseconds despite the name.
                        if let Ok(us) = rest.trim().parse::<f64>() {
                            let secs = us / 1_000_000.0;
                            // No reliable duration here; use a slow-creep curve
                            // capped at 95% so the bar never lies "done" early.
                            let pct = (1.0 - (-secs / 20.0).exp()) * 95.0;
                            progress::emit(
                                app,
                                "postprocess",
                                Some(pct as f32),
                                "Making Windows-compatible (H.264) …",
                            );
                        }
                    }
                }
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|_| AppError::msg("Transcode interrupted."))?;
    if !status.success() || !tmp.is_file() {
        let _ = std::fs::remove_file(&tmp);
        return Err(AppError::msg("Transcode failed."));
    }

    progress::emit(app, "postprocess", Some(100.0), "Windows-compatible (H.264) ✓");
    Ok(tmp)
}

pub async fn file_has_audio(app: &AppHandle, media: &Path) -> Result<bool, AppError> {
    let ffprobe = paths::ffmpeg_dir(app)?.join(paths::sidecar_filename("ffprobe"));
    if !ffprobe.is_file() {
        return Ok(true);
    }

    let media_arg = media.to_string_lossy().into_owned();
    let mut cmd = TokioCommand::new(&ffprobe);
    cmd.args([
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        &media_arg,
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::null())
    .stdin(Stdio::null())
    .kill_on_drop(true);
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = match cmd.spawn() {
        Ok(child) => child,
        Err(_) => return Ok(true),
    };
    let mut stdout = String::new();
    if let Some(pipe) = child.stdout.take() {
        let mut reader = BufReader::new(pipe);
        let _ = reader.read_to_string(&mut stdout).await;
    }
    let _ = child.wait().await;
    Ok(stdout.to_ascii_lowercase().contains("audio"))
}
