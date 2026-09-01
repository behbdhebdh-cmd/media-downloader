import { formatDuration, detectPlatform, type ResolveResult } from "../api";

export class MediaPreview {
  public element: HTMLElement;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "media-preview-container";
    this.element.hidden = true;
  }

  public showSkeleton(url: string) {
    const platform = detectPlatform(url);
    this.element.hidden = false;
    this.element.className = "media-preview-container is-loading";

    this.element.innerHTML = `
      <div class="media-card shimmer-card">
        <div class="media-thumb-box skeleton-box">
          <div class="skeleton-shimmer"></div>
        </div>
        <div class="media-info-box">
          <div class="media-meta-row">
            <div class="media-platform-pill" style="--pill-color: ${platform.color}">
              <span class="platform-dot"></span>
              <span>${platform.name}</span>
            </div>
          </div>
          <div class="skeleton-line skeleton-title">
            <div class="skeleton-shimmer"></div>
          </div>
          <div class="skeleton-line skeleton-sub">
            <div class="skeleton-shimmer"></div>
          </div>
          <div class="media-resolving-hint">
            <span class="resolving-spinner"></span>
            <span>Inspecting metadata & available streams…</span>
          </div>
        </div>
      </div>
    `;
  }

  public showData(data: ResolveResult, url: string) {
    this.element.hidden = false;
    this.element.className = "media-preview-container is-loaded";

    const platform = detectPlatform(url, data.extractor);
    const duration = formatDuration(data.duration_sec);

    let thumbUrl = data.thumbnail?.trim() || "";
    if (thumbUrl.startsWith("//")) {
      thumbUrl = "https:" + thumbUrl;
    }

    const hasThumb = Boolean(thumbUrl);
    const thumbHtml = hasThumb
      ? `
        <img 
          class="media-thumb-img" 
          src="${escapeHtml(thumbUrl)}" 
          alt="${escapeHtml(data.title)}" 
          loading="eager"
          referrerpolicy="no-referrer"
          crossorigin="anonymous"
          onerror="if (this.src.includes('maxresdefault.jpg')) { this.src = this.src.replace('maxresdefault.jpg', 'hqdefault.jpg'); } else { this.parentElement.classList.add('thumb-failed'); }"
        />
        <div class="media-thumb-fallback">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      `
      : `
        <div class="media-thumb-fallback">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      `;

    this.element.innerHTML = `
      <div class="media-card">
        <div class="media-thumb-box">
          ${thumbHtml}
          ${duration ? `<span class="media-duration-badge">${duration}</span>` : ""}
        </div>
        <div class="media-info-box">
          <div class="media-meta-row">
            <span class="media-platform-pill" style="--pill-color: ${platform.color}">
              <span class="platform-dot"></span>
              <span>${platform.name}</span>
            </span>
            ${data.formats_summary ? `<span class="media-format-badge">${escapeHtml(data.formats_summary)}</span>` : ""}
          </div>
          <h2 class="media-title" title="${escapeHtml(data.title)}">${escapeHtml(data.title)}</h2>
          <div class="media-status-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span>Ready for extraction</span>
          </div>
        </div>
      </div>
    `;
  }

  public hide() {
    this.element.className = "media-preview-container is-hiding";
    setTimeout(() => {
      if (this.element.classList.contains("is-hiding")) {
        this.element.hidden = true;
        this.element.innerHTML = "";
      }
    }, 160);
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
