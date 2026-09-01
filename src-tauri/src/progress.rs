use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const EVENT: &str = "download-progress";

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub phase: String,
    pub percent: Option<f32>,
    pub message: String,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Stage {
    Video,
    Audio,
    Merge,
}

pub struct DownloadProgress {
    stage: Stage,
    last_raw: f32,
    mapped: f32,
    saw_file: bool,
}

impl DownloadProgress {
    pub fn new(audio_only: bool) -> Self {
        Self {
            stage: if audio_only { Stage::Audio } else { Stage::Video },
            last_raw: 0.0,
            mapped: 0.0,
            saw_file: false,
        }
    }

    pub fn on_line(&mut self, line: &str) -> Option<(f32, String)> {
        let line = line.trim();
        if line.is_empty() {
            return None;
        }

        if is_merge_line(line) {
            self.stage = Stage::Merge;
            self.mapped = self.mapped.max(92.0);
            return Some((self.mapped.min(99.0), "Merging …".into()));
        }

        if let Some(dest) = destination(line) {
            self.note_destination(dest);
        }

        let raw = parse_mdl_percent(line).or_else(|| parse_download_percent(line))?;
        if self.saw_file && raw + 2.0 < self.last_raw && self.stage == Stage::Video {
            self.stage = Stage::Audio;
        }
        self.last_raw = raw;
        self.saw_file = true;

        let mapped = match self.stage {
            Stage::Video => raw * 0.55,
            Stage::Audio => {
                if self.mapped < 40.0 {
                    raw * 0.90
                } else {
                    55.0 + raw * 0.37
                }
            }
            Stage::Merge => 92.0 + raw * 0.07,
        };
        self.mapped = self.mapped.max(mapped).clamp(0.0, 99.0);
        let message = match self.stage {
            Stage::Video => format!("Video {} %", raw.round() as i32),
            Stage::Audio => format!("Audio {} %", raw.round() as i32),
            Stage::Merge => "Merging …".into(),
        };
        Some((self.mapped, message))
    }
}

fn is_merge_line(line: &str) -> bool {
    line.starts_with("MDLPOST:")
        || line.contains("[Merger]")
        || line.contains("[ExtractAudio]")
        || line.contains("[FixupM4a]")
        || line.contains("[VideoRemuxer]")
}

fn destination(line: &str) -> Option<&str> {
    line.split_once("Destination:")
        .map(|(_, rest)| rest.trim())
        .filter(|rest| !rest.is_empty())
}

fn note_is_audio(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    [".m4a", ".mp3", ".opus", ".ogg", ".aac", ".wav", ".weba"]
        .iter()
        .any(|ext| lower.contains(ext))
}

impl DownloadProgress {
    fn note_destination(&mut self, dest: &str) {
        if note_is_audio(dest) {
            self.stage = Stage::Audio;
        } else if self.saw_file && self.stage == Stage::Video {
            self.stage = Stage::Audio;
        } else if self.stage != Stage::Audio {
            self.stage = Stage::Video;
        }
        self.last_raw = 0.0;
    }
}

pub fn emit(app: &AppHandle, phase: &str, percent: Option<f32>, message: &str) {
    let _ = app.emit(
        EVENT,
        ProgressPayload {
            phase: phase.to_string(),
            percent,
            message: message.to_string(),
        },
    );
}

pub fn parse_mdl_percent(line: &str) -> Option<f32> {
    let rest = line.strip_prefix("MDL:")?;
    parse_percent_number(rest)
}

pub fn parse_download_percent(line: &str) -> Option<f32> {
    if !line.contains("[download]") || !line.contains('%') {
        return None;
    }
    let before = line.split('%').next()?;
    let token = before.split_whitespace().last()?;
    token.parse::<f32>().ok()
}

fn parse_percent_number(raw: &str) -> Option<f32> {
    let trimmed = raw.trim().trim_end_matches('%').trim();
    trimmed.parse::<f32>().ok().map(|v| v.clamp(0.0, 100.0))
}
