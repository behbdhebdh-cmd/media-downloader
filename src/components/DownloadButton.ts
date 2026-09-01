import type { Container, Preset } from "../api";

export type ButtonState = "idle" | "resolving" | "downloading" | "success" | "error";

export class DownloadButton {
  public element: HTMLElement;
  private btnEl: HTMLButtonElement;
  private barEl: HTMLElement;
  private labelEl: HTMLElement;
  private subLabelEl: HTMLElement;
  private iconEl: HTMLElement;
  private successActionsEl: HTMLElement;
  private currentState: ButtonState = "idle";
  private currentPercent = 0;
  private onClickCallback?: () => void;
  private onOpenFolderCallback?: () => void;

  constructor(onClick?: () => void, onOpenFolder?: () => void) {
    this.onClickCallback = onClick;
    this.onOpenFolderCallback = onOpenFolder;

    this.element = document.createElement("div");
    this.element.className = "download-button-wrapper";

    this.element.innerHTML = `
      <button type="button" class="download-action-btn state-idle" id="btn-download-action">
        <div class="download-progress-fill" id="download-progress-bar"></div>
        <div class="download-btn-content">
          <span class="btn-icon" id="download-btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </span>
          <div class="btn-text-group">
            <span class="btn-label" id="download-btn-label">Download</span>
            <span class="btn-sublabel" id="download-btn-sublabel"></span>
          </div>
        </div>
      </button>

      <div class="download-success-actions" id="download-success-actions" hidden>
        <button type="button" class="success-open-btn" id="btn-success-open">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
          <span>Show in Folder</span>
        </button>
      </div>
    `;

    this.btnEl = this.element.querySelector("#btn-download-action") as HTMLButtonElement;
    this.barEl = this.element.querySelector("#download-progress-bar") as HTMLElement;
    this.labelEl = this.element.querySelector("#download-btn-label") as HTMLElement;
    this.subLabelEl = this.element.querySelector("#download-btn-sublabel") as HTMLElement;
    this.iconEl = this.element.querySelector("#download-btn-icon") as HTMLElement;
    this.successActionsEl = this.element.querySelector("#download-success-actions") as HTMLElement;

    const successOpenBtn = this.element.querySelector("#btn-success-open") as HTMLButtonElement;
    if (this.onOpenFolderCallback) {
      successOpenBtn.addEventListener("click", this.onOpenFolderCallback);
    }

    this.btnEl.addEventListener("click", () => {
      if (this.currentState === "idle" && this.onClickCallback) {
        this.onClickCallback();
      }
    });
  }

  public setIdle(container: Container, preset: Preset) {
    this.currentState = "idle";
    this.btnEl.disabled = false;
    this.btnEl.className = "download-action-btn state-idle";
    this.barEl.style.width = "0%";
    this.currentPercent = 0;
    this.subLabelEl.textContent = "";
    this.successActionsEl.hidden = true;

    const typeLabel = container === "mp4" ? "MP4 Video" : "MP3 Audio";
    const qualityLabel = preset === "best" ? "Max" : preset.toUpperCase();
    this.labelEl.textContent = `Download ${typeLabel} (${qualityLabel})`;

    this.iconEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    `;
  }

  public setResolving() {
    this.currentState = "resolving";
    this.btnEl.disabled = true;
    this.btnEl.className = "download-action-btn state-resolving";
    this.barEl.style.width = "0%";
    this.labelEl.textContent = "Checking link & formats…";
    this.subLabelEl.textContent = "";
    this.successActionsEl.hidden = true;

    this.iconEl.innerHTML = `
      <span class="btn-spinner"></span>
    `;
  }

  public setProgress(phase: string, percent?: number | null, message?: string) {
    this.currentState = "downloading";
    this.btnEl.disabled = true;
    this.btnEl.className = "download-action-btn state-downloading";
    this.successActionsEl.hidden = true;

    if (typeof percent === "number") {
      this.currentPercent = Math.max(0, Math.min(percent, 100));
      this.barEl.style.width = `${this.currentPercent}%`;
    }

    if (phase === "ffmpeg") {
      this.labelEl.textContent = "Downloading ffmpeg dependency…";
      this.subLabelEl.textContent = typeof percent === "number" ? `${Math.round(this.currentPercent)}%` : "";
    } else {
      const pctStr = typeof percent === "number" ? `${Math.round(this.currentPercent)}%` : "";
      this.labelEl.textContent = `Downloading ${pctStr ? `• ${pctStr}` : ""}`;
      this.subLabelEl.textContent = message || "Please wait…";
    }

    this.iconEl.innerHTML = `
      <span class="btn-spinner"></span>
    `;
  }

  public setSuccess(container: Container, preset: Preset) {
    this.currentState = "success";
    this.btnEl.disabled = false;
    this.btnEl.className = "download-action-btn state-success";
    this.barEl.style.width = "100%";
    this.labelEl.textContent = "Download Complete!";
    this.subLabelEl.textContent = "File saved successfully";

    this.iconEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;

    this.successActionsEl.hidden = false;

    // Reset after delay if no new interaction
    setTimeout(() => {
      if (this.currentState === "success") {
        this.setIdle(container, preset);
      }
    }, 4500);
  }

  public setError(container: Container, preset: Preset, errorMsg: string) {
    this.currentState = "error";
    this.btnEl.disabled = false;
    this.btnEl.className = "download-action-btn state-error";
    this.barEl.style.width = "0%";
    this.labelEl.textContent = "Download Error";
    this.subLabelEl.textContent = errorMsg || "Please try again";
    this.successActionsEl.hidden = true;

    this.iconEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    `;

    // Reset after 3.5 seconds
    setTimeout(() => {
      if (this.currentState === "error") {
        this.setIdle(container, preset);
      }
    }, 3500);
  }

  public setDisabled(disabled: boolean) {
    this.btnEl.disabled = disabled;
  }
}
