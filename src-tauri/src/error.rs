use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    Message(String),
}

impl AppError {
    pub fn msg(text: impl Into<String>) -> Self {
        Self::Message(text.into())
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub fn from_ytdlp(stderr: &str, stdout: &str) -> AppError {
    let blob = format!("{stderr}\n{stdout}").to_lowercase();
    if blob.contains("private video") || blob.contains("this video is private") {
        return AppError::msg("This video is private.");
    }
    if blob.contains("age-restricted")
        || blob.contains("sign in to confirm your age")
        || blob.contains("confirm your age")
    {
        return AppError::msg("This video is age-restricted.");
    }
    if blob.contains("not available in your country")
        || blob.contains("not made this video available in your country")
        || blob.contains("geo restricted")
        || blob.contains("geo-restricted")
    {
        return AppError::msg("This video is not available in your region.");
    }
    if blob.contains("sign in to confirm you’re not a bot")
        || blob.contains("sign in to confirm you're not a bot")
        || blob.contains("not a bot")
    {
        return AppError::msg("YouTube needs a confirmation. Try again later.");
    }
    if blob.contains("video unavailable") || blob.contains("this video is unavailable") {
        return AppError::msg("Video unavailable.");
    }
    if blob.contains("unsupported url")
        || blob.contains("no video formats")
        || blob.contains("unable to extract")
        || blob.contains("is not a valid url")
    {
        return AppError::msg("This link is not supported. Make sure the TikTok post is public and paste the full link.");
    }
    if blob.contains("http error 429") || blob.contains("too many requests") {
        return AppError::msg("Too many requests. Try again later.");
    }
    if blob.contains("ffmpeg") && (blob.contains("not found") || blob.contains("is needed")) {
        return AppError::msg("ffmpeg is missing. MP4 audio and MP3 need ffmpeg.");
    }
    if blob.contains("could not be merged")
        || (blob.contains("[merger]") && blob.contains("error"))
        || (blob.contains("merging of multiple formats") && blob.contains("error"))
    {
        return AppError::msg("Could not merge video and audio.");
    }
    if blob.contains("javascript runtime") || blob.contains("no supported javascript") {
        return AppError::msg("The JavaScript runtime (qjs) is missing or not responding.");
    }
    AppError::msg("Could not load this link.")
}
