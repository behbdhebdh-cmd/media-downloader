import { runtimeStatus, type RuntimeStatus } from "../api";

export class StartupSplash {
  private element: HTMLElement;
  private statusText: HTMLElement;
  private isDone = false;

  constructor() {
    this.element = document.createElement("div");
    this.element.id = "startup-splash";
    this.element.className = "startup-splash";

    this.element.innerHTML = `
      <div class="splash-content">
        <div class="splash-logo-container">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <span class="splash-title">MediaDownloader</span>
        <div class="splash-status-wrapper">
          <div class="splash-spinner"></div>
          <span class="splash-status-text">Warming engine…</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.element);
    this.statusText = this.element.querySelector(".splash-status-text") as HTMLElement;
  }

  public async runWarmup(): Promise<RuntimeStatus | null> {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 400));

    let status: RuntimeStatus | null = null;
    try {
      this.statusText.textContent = "Checking yt-dlp sidecar…";
      const [fetchedStatus] = await Promise.all([
        runtimeStatus().catch((err) => {
          console.warn("Runtime status check error:", err);
          return null;
        }),
        minDelay,
      ]);
      status = fetchedStatus;
    } catch {
      await minDelay;
    }

    this.statusText.textContent = "Ready";
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.finish();
    return status;
  }

  public finish() {
    if (this.isDone) return;
    this.isDone = true;
    this.element.classList.add("is-leaving");
    setTimeout(() => {
      this.element.remove();
    }, 300);
  }
}
