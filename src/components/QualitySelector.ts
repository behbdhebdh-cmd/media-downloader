import type { Container, Preset } from "../api";

export type QualityOption = {
  value: Preset;
  label: string;
  badge?: string;
};

const MP4_OPTIONS: QualityOption[] = [
  { value: "best", label: "Best Available", badge: "Max" },
  { value: "4k", label: "4K Ultra HD", badge: "2160p" },
  { value: "1080", label: "1080p Full HD", badge: "1080p" },
  { value: "720", label: "720p HD", badge: "720p" },
  { value: "360", label: "360p Fast", badge: "360p" },
];

const MP3_OPTIONS: QualityOption[] = [
  { value: "320", label: "320 kbps High Quality", badge: "320k" },
  { value: "192", label: "192 kbps Standard", badge: "192k" },
];

export class QualitySelector {
  public element: HTMLElement;
  private currentPreset: Preset = "best";
  private currentContainer: Container = "mp4";
  private triggerBtn: HTMLButtonElement;
  private triggerLabel: HTMLElement;
  private menuEl: HTMLElement;
  private isOpen = false;
  private onChangeCallback?: (preset: Preset) => void;

  constructor(onChange?: (preset: Preset) => void) {
    this.onChangeCallback = onChange;

    this.element = document.createElement("div");
    this.element.className = "quality-selector-container";

    this.element.innerHTML = `
      <button type="button" class="quality-trigger-btn" id="quality-trigger" aria-haspopup="listbox" aria-expanded="false">
        <div class="trigger-content">
          <span class="trigger-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </span>
          <span class="trigger-label" id="quality-label">Best Available (Max)</span>
        </div>
        <span class="chevron-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>
      <div class="quality-dropdown-menu" id="quality-menu" role="listbox" hidden></div>
    `;

    this.triggerBtn = this.element.querySelector("#quality-trigger") as HTMLButtonElement;
    this.triggerLabel = this.element.querySelector("#quality-label") as HTMLElement;
    this.menuEl = this.element.querySelector("#quality-menu") as HTMLElement;

    this.setupEvents();
    this.render();
  }

  private setupEvents() {
    this.triggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleOpen();
    });

    document.addEventListener("click", (e) => {
      const target = e.target as Node;
      if (this.isOpen && !this.element.contains(target)) {
        this.close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });
  }

  public setContainer(container: Container) {
    this.currentContainer = container;
    const options = this.getCurrentOptions();
    if (!options.some((o) => o.value === this.currentPreset)) {
      this.currentPreset = options[0].value;
    }
    this.render();
  }

  private getCurrentOptions(): QualityOption[] {
    return this.currentContainer === "mp4" ? MP4_OPTIONS : MP3_OPTIONS;
  }

  public setPreset(preset: Preset, notify = true) {
    this.currentPreset = preset;
    this.render();
    if (notify && this.onChangeCallback) {
      this.onChangeCallback(preset);
    }
  }

  public getPreset(): Preset {
    return this.currentPreset;
  }

  private toggleOpen() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open() {
    this.isOpen = true;
    this.menuEl.hidden = false;
    this.triggerBtn.setAttribute("aria-expanded", "true");
    this.element.classList.add("is-open");
  }

  public close() {
    this.isOpen = false;
    this.element.classList.remove("is-open");
    this.triggerBtn.setAttribute("aria-expanded", "false");
    this.menuEl.hidden = true;
  }

  private render() {
    const options = this.getCurrentOptions();
    const current = options.find((o) => o.value === this.currentPreset) || options[0];

    this.triggerLabel.textContent = `${current.label} ${current.badge ? `(${current.badge})` : ""}`;

    this.menuEl.innerHTML = "";
    for (const opt of options) {
      const isSelected = opt.value === this.currentPreset;
      const item = document.createElement("div");
      item.className = `quality-option-item ${isSelected ? "is-selected" : ""}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", isSelected ? "true" : "false");

      item.innerHTML = `
        <span class="option-label">${opt.label}</span>
        ${opt.badge ? `<span class="option-badge">${opt.badge}</span>` : ""}
        ${
          isSelected
            ? `
          <span class="option-check">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        `
            : ""
        }
      `;

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setPreset(opt.value);
        this.close();
      });

      this.menuEl.appendChild(item);
    }
  }

  public setDisabled(disabled: boolean) {
    this.triggerBtn.disabled = disabled;
    if (disabled) this.close();
  }
}
