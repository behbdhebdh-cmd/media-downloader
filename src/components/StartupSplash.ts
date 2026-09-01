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
      <div class="splash-backdrop"></div>
      <div class="splash-content">
        <div class="splash-logo-container">
          <div class="splash-glow-ring"></div>
          <svg class="splash-logo-icon" viewBox="0 0 1024 1024" width="84" height="84">
            <defs>
              <linearGradient id="splash-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#C084FC" />
                <stop offset="50%" stop-color="#9333EA" />
                <stop offset="100%" stop-color="#6366F1" />
              </linearGradient>
              <filter id="splash-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect width="1024" height="1024" rx="260" fill="#16111F" stroke="rgba(255,255,255,0.1)" stroke-width="20" />
            <path fill="url(#splash-grad)" filter="url(#splash-glow)" d="M512 210c24 0 44 20 44 44v350l110-110c17-17 45-17 62 0s17 45 0 62L543 800c-17 17-45 17-62 0L296 556c-17-17-17-45 0-62s45-17 62 0l110 110V254c0-24 20-44 44-44z"/>
          </svg>
        </div>
        <h1 class="splash-title">MediaDownloader</h1>
        <div class="splash-status-wrapper">
          <div class="splash-spinner"></div>
          <span class="splash-status-text">Initializing engine…</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.element);
    this.statusText = this.element.querySelector(".splash-status-text") as HTMLElement;
  }

  public async runWarmup(): Promise<RuntimeStatus | null> {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 800));

    let status: RuntimeStatus | null = null;
    try {
      this.statusText.textContent = "Checking yt-dlp & ffmpeg…";
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

    this.statusText.textContent = "Ready!";
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.finish();
    return status;
  }

  public finish() {
    if (this.isDone) return;
    this.isDone = true;
    this.element.classList.add("is-leaving");
    setTimeout(() => {
      this.element.remove();
    }, 600);
  }
}
