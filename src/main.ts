import {
  download,
  downloadDirInfo,
  errorMessage,
  onProgress,
  pickDownloadDir,
  resolveLink,
  type Container,
  type Preset,
} from "./api";

const MP4_OPTIONS: { value: Preset; label: string }[] = [
  { value: "best", label: "Best" },
  { value: "4k", label: "4K" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "360", label: "360p" },
];

const MP3_OPTIONS: { value: Preset; label: string }[] = [
  { value: "320", label: "320" },
  { value: "192", label: "192" },
];

const urlInput = document.querySelector("#url") as HTMLInputElement;
const errorEl = document.querySelector("#error") as HTMLParagraphElement;
const folderBtn = document.querySelector("#folder-btn") as HTMLButtonElement;
const controls = document.querySelector("#controls") as HTMLElement;
const pillMp4 = document.querySelector("#pill-mp4") as HTMLButtonElement;
const pillMp3 = document.querySelector("#pill-mp3") as HTMLButtonElement;
const qualityBtn = document.querySelector("#quality-btn") as HTMLButtonElement;
const qualityMenu = document.querySelector("#quality-menu") as HTMLUListElement;
const downloadBtn = document.querySelector("#download") as HTMLButtonElement;
const downloadLabel = document.querySelector("#download-label") as HTMLElement;
const bar = document.querySelector("#bar") as HTMLElement;

let container: Container = "mp4";
let preset: Preset = "best";
let resolvedUrl: string | null = null;
let generation = 0;
let downloadJob = 0;
let debounceTimer: number | undefined;
let busy = false;

function currentOptions() {
  return container === "mp4" ? MP4_OPTIONS : MP3_OPTIONS;
}

function setFolderName(name: string) {
  folderBtn.textContent = `Folder: ${name || "Downloads"}`;
}

function setError(message: string, status = false) {
  errorEl.classList.toggle("is-status", status && Boolean(message));
  if (!message) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    return;
  }
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function setControlsVisible(visible: boolean) {
  controls.hidden = !visible;
  if (!visible) {
    qualityMenu.hidden = true;
  }
}

function renderQuality() {
  const options = currentOptions();
  if (!options.some((item) => item.value === preset)) {
    preset = options[0].value;
  }
  qualityBtn.textContent = options.find((item) => item.value === preset)?.label ?? options[0].label;
  qualityMenu.innerHTML = "";
  for (const option of options) {
    const item = document.createElement("li");
    item.role = "option";
    item.textContent = option.label;
    item.dataset.value = option.value;
    item.setAttribute("aria-selected", option.value === preset ? "true" : "false");
    item.addEventListener("click", () => {
      preset = option.value;
      qualityMenu.hidden = true;
      renderQuality();
    });
    qualityMenu.append(item);
  }
}

function setPills() {
  pillMp4.classList.toggle("is-active", container === "mp4");
  pillMp3.classList.toggle("is-active", container === "mp3");
  renderQuality();
}

function setBusy(next: boolean) {
  busy = next;
  downloadBtn.disabled = next;
  urlInput.disabled = next;
  pillMp4.disabled = next;
  pillMp3.disabled = next;
  qualityBtn.disabled = next;
  folderBtn.disabled = next;
  if (next) {
    qualityMenu.hidden = true;
  }
}

function resetButton() {
  downloadLabel.textContent = "Download";
  bar.style.width = "0%";
}

async function resolveNow() {
  if (busy) {
    return;
  }
  const my = ++generation;
  const url = urlInput.value.trim();
  if (!url) {
    resolvedUrl = null;
    setControlsVisible(false);
    setError("");
    return;
  }
  setError("Checking link …", true);
  try {
    await resolveLink(url);
    if (my !== generation) {
      return;
    }
    resolvedUrl = url;
    setError("");
    setControlsVisible(true);
    setPills();
  } catch (err) {
    if (my !== generation) {
      return;
    }
    resolvedUrl = null;
    setControlsVisible(false);
    setError(errorMessage(err));
  }
}

function scheduleResolve() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    void resolveNow();
  }, 600);
}

function applyProgress(phase: string, percent: number | null | undefined, message: string) {
  if (phase === "ffmpeg") {
    downloadLabel.textContent = "Downloading ffmpeg …";
    if (typeof percent === "number") {
      bar.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
    }
    return;
  }
  if (message) {
    downloadLabel.textContent = message;
  } else if (typeof percent === "number") {
    downloadLabel.textContent = `${Math.round(percent)} %`;
  } else {
    downloadLabel.textContent = "Downloading …";
  }
  if (typeof percent === "number") {
    bar.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
  }
}

async function startDownload() {
  if (busy || !resolvedUrl) {
    return;
  }
  const job = ++downloadJob;
  setBusy(true);
  setError("");
  applyProgress("download", 0, "Downloading …");
  try {
    await download(resolvedUrl, container, preset);
    if (job !== downloadJob) {
      return;
    }
    downloadLabel.textContent = "Done";
    bar.style.width = "100%";
    window.setTimeout(() => {
      if (job === downloadJob) {
        downloadJob = 0;
        resetButton();
      }
    }, 1200);
  } catch (err) {
    if (job !== downloadJob) {
      return;
    }
    downloadJob = 0;
    setError(errorMessage(err));
    resetButton();
  } finally {
    if (job === downloadJob || downloadJob === 0) {
      setBusy(false);
    }
  }
}

async function chooseFolder() {
  if (busy) {
    return;
  }
  try {
    const info = await pickDownloadDir();
    setFolderName(info.name);
  } catch (err) {
    setError(errorMessage(err));
  }
}

pillMp4.addEventListener("click", () => {
  container = "mp4";
  preset = "best";
  setPills();
});

pillMp3.addEventListener("click", () => {
  container = "mp3";
  preset = "320";
  setPills();
});

qualityBtn.addEventListener("click", () => {
  qualityMenu.hidden = !qualityMenu.hidden;
});

folderBtn.addEventListener("click", () => {
  void chooseFolder();
});

document.addEventListener("click", (event) => {
  const target = event.target as Node;
  if (!qualityBtn.contains(target) && !qualityMenu.contains(target)) {
    qualityMenu.hidden = true;
  }
});

urlInput.addEventListener("input", () => {
  if (!urlInput.value.trim()) {
    generation += 1;
    resolvedUrl = null;
    setControlsVisible(false);
    setError("");
  }
  scheduleResolve();
});

urlInput.addEventListener("paste", () => {
  window.setTimeout(() => {
    void resolveNow();
  }, 0);
});

urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    window.clearTimeout(debounceTimer);
    void resolveNow();
  }
});

downloadBtn.addEventListener("click", () => {
  void startDownload();
});

void onProgress((payload) => {
  if (downloadJob === 0) {
    return;
  }
  applyProgress(payload.phase, payload.percent, payload.message);
});

resetButton();
renderQuality();
void downloadDirInfo()
  .then((info) => setFolderName(info.name))
  .catch(() => setFolderName("Downloads"));
