import type { Container } from "../api";

export class FormatSelector {
  public element: HTMLElement;
  private currentContainer: Container = "mp4";
  private btnMp4: HTMLButtonElement;
  private btnMp3: HTMLButtonElement;
  private onChangeCallback?: (container: Container) => void;

  constructor(onChange?: (container: Container) => void) {
    this.onChangeCallback = onChange;

    this.element = document.createElement("div");
    this.element.className = "format-segmented-control";
    this.element.setAttribute("role", "radiogroup");
    this.element.setAttribute("aria-label", "Target media format");

    this.element.innerHTML = `
      <button type="button" class="segment-btn is-active" id="segment-mp4" role="radio" aria-checked="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
        <span>Video (MP4)</span>
      </button>
      <button type="button" class="segment-btn" id="segment-mp3" role="radio" aria-checked="false">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <span>Audio (MP3)</span>
      </button>
    `;

    this.btnMp4 = this.element.querySelector("#segment-mp4") as HTMLButtonElement;
    this.btnMp3 = this.element.querySelector("#segment-mp3") as HTMLButtonElement;

    this.setupEvents();
  }

  private setupEvents() {
    this.btnMp4.addEventListener("click", () => {
      this.setContainer("mp4");
    });

    this.btnMp3.addEventListener("click", () => {
      this.setContainer("mp3");
    });
  }

  public setContainer(container: Container, notify = true) {
    if (this.currentContainer === container && notify) return;
    this.currentContainer = container;

    const isMp4 = container === "mp4";
    this.btnMp4.classList.toggle("is-active", isMp4);
    this.btnMp4.setAttribute("aria-checked", isMp4 ? "true" : "false");

    this.btnMp3.classList.toggle("is-active", !isMp4);
    this.btnMp3.setAttribute("aria-checked", !isMp4 ? "true" : "false");

    if (notify && this.onChangeCallback) {
      this.onChangeCallback(container);
    }
  }

  public getContainer(): Container {
    return this.currentContainer;
  }

  public setDisabled(disabled: boolean) {
    this.btnMp4.disabled = disabled;
    this.btnMp3.disabled = disabled;
  }
}
