export class Header {
  public element: HTMLElement;
  private statusDot: HTMLElement;
  private statusLabel: HTMLElement;

  constructor(onOpenFolder?: () => void) {
    this.element = document.createElement("header");
    this.element.className = "app-header";

    this.element.innerHTML = `
      <div class="header-brand">
        <div class="header-logo">
          <svg viewBox="0 0 1024 1024" width="28" height="28">
            <defs>
              <linearGradient id="header-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#C084FC" />
                <stop offset="100%" stop-color="#7C3AED" />
              </linearGradient>
            </defs>
            <rect width="1024" height="1024" rx="260" fill="#1A1424" />
            <path fill="url(#header-grad)" d="M512 210c24 0 44 20 44 44v350l110-110c17-17 45-17 62 0s17 45 0 62L543 800c-17 17-45 17-62 0L296 556c-17-17-17-45 0-62s45-17 62 0l110 110V254c0-24 20-44 44-44z"/>
          </svg>
        </div>
        <div class="header-title-group">
          <h1 class="header-title">MediaDownloader</h1>
          <span class="header-badge">v0.1</span>
        </div>
      </div>

      <div class="header-actions">
        <div class="engine-status-pill" id="engine-status" title="Sidecar & Engine Status">
          <span class="status-dot is-online"></span>
          <span class="status-label">Engine Ready</span>
        </div>

        <button type="button" class="header-icon-btn" id="header-folder-btn" title="Open Downloads Folder in Explorer" aria-label="Open Downloads Folder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    this.statusLabel.textContent = text || (status === "online" ? "Engine Ready" : status === "checking" ? "Checking…" : "Engine Error");
  }
}
