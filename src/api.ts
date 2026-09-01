import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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

export function resolveLink(url: string) {
  return invoke<ResolveResult>("resolve_link", { url });
}

export function download(url: string, container: Container, preset: Preset) {
  return invoke<DownloadResult>("download", { url, container, preset });
}

export type DownloadDirInfo = {
  name: string;
};

export function downloadDirInfo() {
  return invoke<DownloadDirInfo>("download_dir_info");
}

export function pickDownloadDir() {
  return invoke<DownloadDirInfo>("pick_download_dir");
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

export function onProgress(handler: (payload: ProgressPayload) => void) {
  return listen<ProgressPayload>("download-progress", (event) => {
    handler(event.payload);
  });
}
