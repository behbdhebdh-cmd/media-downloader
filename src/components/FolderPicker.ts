import { pickDownloadDir, type DownloadDirInfo } from "../api";
import { toast } from "./Toast";

export class FolderPicker {
  public element: HTMLElement;
  private folderNameEl: HTMLElement;
  private changeBtn: HTMLButtonElement;
  private currentDirName = "Downloads";
  private onDirChangeCallback?: (info: DownloadDirInfo) => void;

  constructor(onDirChange?: (info: DownloadDirInfo) => void) {
    this.onDirChangeCallback = onDirChange;

    this.element = document.createElement("div");
    this.element.className = "folder-picker-bar";

    this.element.innerHTML = `
      <div class="folder-info">
        <span class="folder-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
        </span>
        <span class="folder-label">Save to:</span>
        <span class="folder-name" id="folder-name" title="Download folder">Downloads</span>
      </div>
      <button type="button" class="folder-change-btn" id="folder-change-btn">
        <span>Change</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    `;

    this.folderNameEl = this.element.querySelector("#folder-name") as HTMLElement;
    this.changeBtn = this.element.querySelector("#folder-change-btn") as HTMLButtonElement;

    this.setupEvents();
  }

  private setupEvents() {
    this.element.addEventListener("click", () => {
      if (!this.changeBtn.disabled) {
        this.promptPickDir();
      }
    });
  }

  public async promptPickDir() {
    try {
      const info = await pickDownloadDir();
      if (info && info.name) {
        this.setFolderName(info.name);
        toast.show(`Download folder set to: ${info.name}`, "info", 2500);
        if (this.onDirChangeCallback) {
          this.onDirChangeCallback(info);
        }
      }
    } catch (err) {
      console.warn("Folder picker canceled or errored:", err);
    }
  }

  public setFolderName(name: string) {
    this.currentDirName = name || "Downloads";
    this.folderNameEl.textContent = this.currentDirName;
    this.folderNameEl.title = this.currentDirName;
  }

  public getFolderName(): string {
    return this.currentDirName;
  }

  public setDisabled(disabled: boolean) {
    this.changeBtn.disabled = disabled;
    this.element.classList.toggle("is-disabled", disabled);
  }
}
