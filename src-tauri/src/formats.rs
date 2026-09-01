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

pub fn download_args(container: Container, preset: Preset) -> Result<Vec<String>, AppError> {
    match (container, preset) {
        (Container::Mp4, Preset::Best) => Ok(mp4_args(
            "bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b[acodec!=none]",
        )),
        (Container::Mp4, Preset::FourK) => Ok(mp4_args(
            "bv*[height<=2160][ext=mp4]+ba[ext=m4a]/bv*[height<=2160]+ba/b[height<=2160][acodec!=none]",
        )),
        (Container::Mp4, Preset::P1080) => Ok(mp4_args(
            "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080][acodec!=none]",
        )),
        (Container::Mp4, Preset::P720) => Ok(mp4_args(
            "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/b[height<=720][acodec!=none]",
        )),
        (Container::Mp4, Preset::P360) => Ok(mp4_args(
            "bv*[height<=360][ext=mp4]+ba[ext=m4a]/bv*[height<=360]+ba/b[height<=360][acodec!=none]",
        )),
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
