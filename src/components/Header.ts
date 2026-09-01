export class Header {
  public element: HTMLElement;
  private statusDot: HTMLElement;
  private statusLabel: HTMLElement;

  constructor(onOpenFolder?: () => void) {
    this.element = document.createElement("header");
    this.element.className = "app-header";

    this.element.innerHTML = `
      <div class="header-brand">
        <div class="header-logo" title="MediaDownloader">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div class="header-title-group">
          <span class="header-title">MediaDownloader</span>
          <span class="header-badge">v0.1.0</span>
        </div>
      </div>

      <div class="header-actions">
        <div class="engine-status-pill" id="engine-status" title="yt-dlp Engine Status">
          <span class="status-dot is-online"></span>
          <span class="status-label">Ready</span>
        </div>

        <button type="button" class="header-icon-btn" id="header-folder-btn" title="Open Downloads Folder in Explorer" aria-label="Open Downloads Folder">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
          </svg>
        </button>
      </div>
    `;

    this.statusDot = this.element.querySelector(".status-dot") as HTMLElement;
    this.statusLabel = this.element.querySelector(".status-label") as HTMLElement;

    const folderBtn = this.element.querySelector("#header-folder-btn") as HTMLButtonElement;
    if (onOpenFolder) {
      folderBtn.addEventListener("click", onOpenFolder);
    }
  }

  public setEngineStatus(status: "online" | "checking" | "warning" | "error", text?: string) {
    this.statusDot.className = `status-dot is-${status}`;
    this.statusLabel.textContent = text || (status === "online" ? "Ready" : status === "checking" ? "Checking…" : "Engine Error");
  }
}
