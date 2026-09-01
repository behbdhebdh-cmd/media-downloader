import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type Container = "mp4" | "mp3";
export type Preset = "best" | "4k" | "1080" | "720" | "360" | "320" | "192";

export type ResolveResult = {
  title: string;
  extractor: string;
  duration_sec?: number | null;
  thumbnail?: string | null;
  formats_summary: string;
};

export type DownloadResult = {
  path: string;
  bytes?: number | null;
};

export type ProgressPayload = {
  phase: string;
  percent?: number | null;
  message: string;
};

export type RuntimeStatus = {
  ytdlp: string;
  qjs: string;
  ffmpeg: string;
  ffprobe: string;
  ffmpeg_path?: string | null;
  qjs_path?: string | null;
};

export type DownloadDirInfo = {
  name: string;
};

export function resolveLink(url: string): Promise<ResolveResult> {
  return invoke<ResolveResult>("resolve_link", { url });
}

export function download(url: string, container: Container, preset: Preset): Promise<DownloadResult> {
  return invoke<DownloadResult>("download", { url, container, preset });
}

export function runtimeStatus(): Promise<RuntimeStatus> {
  return invoke<RuntimeStatus>("runtime_status");
}

export function downloadDirInfo(): Promise<DownloadDirInfo> {
  return invoke<DownloadDirInfo>("download_dir_info");
}

export function pickDownloadDir(): Promise<DownloadDirInfo> {
  return invoke<DownloadDirInfo>("pick_download_dir");
}

export function openDownloadDir(): Promise<void> {
  return invoke("open_download_dir");
}

export function onProgress(handler: (payload: ProgressPayload) => void): Promise<UnlistenFn> {
  return listen<ProgressPayload>("download-progress", (event) => {
    handler(event.payload);
  });
}

export function errorMessage(err: unknown): string {
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  if (err && typeof err === "object") {
    const record = err as { message?: unknown; error?: unknown };
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
  }
  return "Something went wrong.";
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let val = bytes;
  let unitIndex = 0;
  while (val >= 1024 && unitIndex < units.length - 1) {
    val /= 1024;
    unitIndex++;
  }
  return `${val.toFixed(1)} ${units[unitIndex]}`;
}

export function detectPlatform(url: string, extractor?: string): { name: string; icon: string; color: string } {
  const lowUrl = url.toLowerCase();
  const lowExt = (extractor || "").toLowerCase();

  if (lowUrl.includes("youtube.com") || lowUrl.includes("youtu.be") || lowExt.includes("youtube")) {
    return { name: "YouTube", icon: "youtube", color: "#FF0000" };
  }
  if (lowUrl.includes("tiktok.com") || lowExt.includes("tiktok")) {
    return { name: "TikTok", icon: "tiktok", color: "#00F2FE" };
  }
  if (lowUrl.includes("instagram.com") || lowExt.includes("instagram")) {
    return { name: "Instagram", icon: "instagram", color: "#E1306C" };
  }
  if (lowUrl.includes("twitter.com") || lowUrl.includes("x.com") || lowExt.includes("twitter")) {
    return { name: "X (Twitter)", icon: "twitter", color: "#1DA1F2" };
  }
  if (lowUrl.includes("soundcloud.com") || lowExt.includes("soundcloud")) {
    return { name: "SoundCloud", icon: "soundcloud", color: "#FF5500" };
  }
  if (lowUrl.includes("vimeo.com") || lowExt.includes("vimeo")) {
    return { name: "Vimeo", icon: "vimeo", color: "#1AB7EA" };
  }
  if (lowUrl.includes("reddit.com") || lowExt.includes("reddit")) {
    return { name: "Reddit", icon: "reddit", color: "#FF4500" };
  }
  if (lowUrl.includes("twitch.tv") || lowExt.includes("twitch")) {
    return { name: "Twitch", icon: "twitch", color: "#9146FF" };
  }
  return { name: extractor || "Web Media", icon: "globe", color: "#9B7CFF" };
}
