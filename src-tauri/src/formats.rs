use serde::Deserialize;

use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Container {
    Mp4,
    Mp3,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum Preset {
    #[serde(rename = "best")]
    Best,
    #[serde(rename = "4k")]
    FourK,
    #[serde(rename = "1080")]
    P1080,
    #[serde(rename = "720")]
    P720,
    #[serde(rename = "360")]
    P360,
    #[serde(rename = "320")]
    A320,
    #[serde(rename = "192")]
    A192,
}

impl Container {
    pub fn extension(self) -> &'static str {
        match self {
            Container::Mp4 => "mp4",
            Container::Mp3 => "mp3",
        }
    }
}

pub fn needs_ffmpeg(_container: Container, _preset: Preset) -> bool {
    true
}

fn mp4_args(selector: &str) -> Vec<String> {
    vec![
        "-f".into(),
        selector.into(),
        "--merge-output-format".into(),
        "mp4".into(),
    ]
}

/// Prefer H.264 (avc1/avc3) video: stock Windows, macOS, phones and editors
/// decode it natively. HEVC/AV1 in an mp4 container would require the paid
/// Microsoft codec extension on Windows, so we only fall back to it when a
/// source genuinely has no H.264 format (the final `b…` fallback preserves
/// today's behavior in that case).
fn mp4_args_h264(height: Option<u32>) -> Vec<String> {
    let cap = height.map(|h| format!("[height<={h}]")).unwrap_or_default();
    // TikTok frequently exposes a single progressive mp4 format. Keep that
    // as an explicit fallback before the generic best-format fallback so the
    // extractor does not reject otherwise valid TikTok links.
    mp4_args(&format!(
        "bv*{cap}[ext=mp4][vcodec^=avc]+ba[ext=m4a]/b{cap}[ext=mp4]/bv*{cap}[vcodec^=avc]+ba/b{cap}[acodec!=none]/b{cap}"
    ))
}

pub fn download_args(container: Container, preset: Preset) -> Result<Vec<String>, AppError> {
    match (container, preset) {
        (Container::Mp4, Preset::Best) => Ok(mp4_args_h264(None)),
        (Container::Mp4, Preset::FourK) => Ok(mp4_args_h264(Some(2160))),
        (Container::Mp4, Preset::P1080) => Ok(mp4_args_h264(Some(1080))),
        (Container::Mp4, Preset::P720) => Ok(mp4_args_h264(Some(720))),
        (Container::Mp4, Preset::P360) => Ok(mp4_args_h264(Some(360))),
        (Container::Mp3, Preset::A320) => Ok(vec![
            "-f".into(),
            "ba/b".into(),
            "-x".into(),
            "--audio-format".into(),
            "mp3".into(),
            "--audio-quality".into(),
            "320K".into(),
        ]),
        (Container::Mp3, Preset::A192) => Ok(vec![
            "-f".into(),
            "ba/b".into(),
            "-x".into(),
            "--audio-format".into(),
            "mp3".into(),
            "--audio-quality".into(),
            "192K".into(),
        ]),
        _ => Err(AppError::msg(
            "Invalid format and quality combination.",
        )),
    }
}
