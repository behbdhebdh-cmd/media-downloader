import {
  download,
  downloadDirInfo,
  errorMessage,
  onProgress,
  openDownloadDir,
  resolveLink,
  type Container,
  type Preset,
  type ResolveResult,
} from "./api";
import { DownloadButton } from "./components/DownloadButton";
import { FolderPicker } from "./components/FolderPicker";
import { FormatSelector } from "./components/FormatSelector";
import { Header } from "./components/Header";
import { MediaPreview } from "./components/MediaPreview";
import { QualitySelector } from "./components/QualitySelector";
import { StartupSplash } from "./components/StartupSplash";
import { toast } from "./components/Toast";
import { UrlInput } from "./components/UrlInput";

class App {
  private container: Container = "mp4";
  private preset: Preset = "best";
  private resolvedUrl: string | null = null;
  private resolveGeneration = 0;
  private activeDownloadJob = 0;
  private isBusy = false;

  private header: Header;
  private urlInput: UrlInput;
  private mediaPreview: MediaPreview;
  private formatSelector: FormatSelector;
  private qualitySelector: QualitySelector;
  private folderPicker: FolderPicker;
  private downloadButton: DownloadButton;
  private splash: StartupSplash;

  constructor() {
    this.splash = new StartupSplash();

    // Header folder button opens destination in Explorer
    this.header = new Header(() => this.handleOpenFolder());
    this.urlInput = new UrlInput((url: string) => this.handleUrlChange(url));
    this.mediaPreview = new MediaPreview();

    this.formatSelector = new FormatSelector((container) => {
      this.container = container;
      this.qualitySelector.setContainer(container);
      this.preset = this.qualitySelector.getPreset();
      this.downloadButton.setIdle(this.container, this.preset);
    });

    this.qualitySelector = new QualitySelector((preset) => {
      this.preset = preset;
      this.downloadButton.setIdle(this.container, this.preset);
    });

    this.folderPicker = new FolderPicker();

    this.downloadButton = new DownloadButton(
      () => this.startDownload(),
      () => this.handleOpenFolder()
    );

    this.mount();
    this.init();
  }

  private mount() {
    const root = document.getElementById("app");
    if (!root) return;

    root.innerHTML = "";
    root.appendChild(this.header.element);

    const mainEl = document.createElement("main");
    mainEl.className = "app-main";

    mainEl.appendChild(this.urlInput.element);
    mainEl.appendChild(this.mediaPreview.element);

    const controlsRow = document.createElement("div");
    controlsRow.className = "controls-row";
    controlsRow.appendChild(this.formatSelector.element);
    controlsRow.appendChild(this.qualitySelector.element);
    mainEl.appendChild(controlsRow);

    mainEl.appendChild(this.folderPicker.element);
    mainEl.appendChild(this.downloadButton.element);

    root.appendChild(mainEl);
  }

  private async init() {
    this.downloadButton.setIdle(this.container, this.preset);

    // Subscribe to download progress events
    void onProgress((payload) => {
      if (this.activeDownloadJob === 0) return;
      this.downloadButton.setProgress(payload.phase, payload.percent, payload.message);
    });

    // Run warmup
    const status = await this.splash.runWarmup();
    if (status) {
      this.header.setEngineStatus("online", "Engine Ready");
    }

    // Load initial download directory name
    try {
      const info = await downloadDirInfo();
      if (info && info.name) {
        this.folderPicker.setFolderName(info.name);
      }
    } catch {
      this.folderPicker.setFolderName("Downloads");
    }
  }

  private async handleUrlChange(url: string) {
    if (this.isBusy) return;

    const trimmed = url.trim();
    const generation = ++this.resolveGeneration;

    if (!trimmed) {
      this.resolvedUrl = null;
      this.mediaPreview.hide();
      this.downloadButton.setIdle(this.container, this.preset);
      return;
    }

    this.mediaPreview.showSkeleton(trimmed);
    this.downloadButton.setResolving();

    try {
      const result: ResolveResult = await resolveLink(trimmed);
      if (generation !== this.resolveGeneration) return;

      this.resolvedUrl = trimmed;
      this.mediaPreview.showData(result, trimmed);
      this.downloadButton.setIdle(this.container, this.preset);
    } catch (err) {
      if (generation !== this.resolveGeneration) return;

      this.resolvedUrl = null;
      this.mediaPreview.hide();
      const msg = errorMessage(err);
      toast.show(msg, "error", 4000);
      this.downloadButton.setIdle(this.container, this.preset);
    }
  }

  private async startDownload() {
    if (this.isBusy || !this.resolvedUrl) {
      if (!this.resolvedUrl) {
        toast.show("Please paste a valid media link first", "warning", 3000);
      }
      return;
    }

    const job = ++this.activeDownloadJob;
    this.setBusy(true);
    this.downloadButton.setProgress("download", 0, "Starting download…");

    try {
      await download(this.resolvedUrl, this.container, this.preset);
      if (job !== this.activeDownloadJob) return;

      this.downloadButton.setSuccess(this.container, this.preset);
      toast.show("Download completed successfully!", "success", 4000);
    } catch (err) {
      if (job !== this.activeDownloadJob) return;

      const msg = errorMessage(err);
      this.downloadButton.setError(this.container, this.preset, msg);
      toast.show(msg, "error", 5000);
    } finally {
      if (job === this.activeDownloadJob) {
        this.activeDownloadJob = 0;
      }
      this.setBusy(false);
    }
  }

  private async handleOpenFolder() {
    try {
      await openDownloadDir();
    } catch (err) {
      console.warn("Could not open download directory:", err);
      toast.show("Could not open folder in Explorer", "error", 3000);
    }
  }

  private setBusy(busy: boolean) {
    this.isBusy = busy;
    this.urlInput.setDisabled(busy);
    this.formatSelector.setDisabled(busy);
    this.qualitySelector.setDisabled(busy);
    this.folderPicker.setDisabled(busy);
  }
}

// Bootstrap app on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new App());
} else {
  new App();
}
