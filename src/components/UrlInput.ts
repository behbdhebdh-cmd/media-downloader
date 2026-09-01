import { toast } from "./Toast";

export class UrlInput {
  public element: HTMLElement;
  public input: HTMLInputElement;
  private clearBtn: HTMLButtonElement;
  private pasteBtn: HTMLButtonElement;
  private onResolveCallback?: (url: string) => void;
  private debounceTimer?: number;

  constructor(onResolve?: (url: string) => void) {
    this.onResolveCallback = onResolve;

    this.element = document.createElement("div");
    this.element.className = "url-input-container";

    this.element.innerHTML = `
      <div class="url-input-box">
        <span class="url-input-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </span>
        <input
          id="url-input-field"
          class="url-input-field"
          type="text"
          placeholder="Paste or drag media link (YouTube, TikTok, SoundCloud, X…)"
          autocomplete="off"
          spellcheck="false"
          inputmode="url"
        />
        <div class="url-input-actions">
          <button type="button" class="input-action-btn clear-btn" id="btn-clear" title="Clear input" hidden>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button type="button" class="input-action-btn paste-btn" id="btn-paste" title="Paste from clipboard (Ctrl+V)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <span>Paste</span>
            <span class="kbd-hint">Ctrl+V</span>
          </button>
        </div>
      </div>
    `;

    this.input = this.element.querySelector("#url-input-field") as HTMLInputElement;
    this.clearBtn = this.element.querySelector("#btn-clear") as HTMLButtonElement;
    this.pasteBtn = this.element.querySelector("#btn-paste") as HTMLButtonElement;

    this.setupEvents();
  }

  private setupEvents() {
    this.input.addEventListener("input", () => {
      this.updateState();
      this.scheduleResolve();
    });

    this.input.addEventListener("paste", () => {
      setTimeout(() => {
        this.updateState();
        this.triggerResolveImmediately();
      }, 0);
    });

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.triggerResolveImmediately();
      } else if (e.key === "Escape") {
        this.clear();
      }
    });

    this.clearBtn.addEventListener("click", () => {
      this.clear();
      this.input.focus();
    });

    this.pasteBtn.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          this.setValue(text.trim());
          this.triggerResolveImmediately();
          toast.show("Pasted link from clipboard", "info", 1800);
        } else {
          toast.show("No text in clipboard", "warning", 2000);
        }
      } catch {
        toast.show("Could not access clipboard", "error", 2500);
      }
    });

    // Global drag & drop support
    window.addEventListener("dragover", (e) => {
      e.preventDefault();
      document.body.classList.add("is-dragging-url");
    });

    window.addEventListener("dragleave", (e) => {
      if (e.clientX <= 0 || e.clientY <= 0) {
        document.body.classList.remove("is-dragging-url");
      }
    });

    window.addEventListener("drop", (e) => {
      e.preventDefault();
      document.body.classList.remove("is-dragging-url");
      const text = e.dataTransfer?.getData("text") || e.dataTransfer?.getData("URL");
      if (text && text.trim()) {
        this.setValue(text.trim());
        this.triggerResolveImmediately();
        toast.show("Link detected and loaded", "info", 1800);
      }
    });
  }

  private updateState() {
    const val = this.input.value.trim();
    this.clearBtn.hidden = val.length === 0;
  }

  public setValue(val: string) {
    this.input.value = val;
    this.updateState();
  }

  public getValue(): string {
    return this.input.value.trim();
  }

  public clear() {
    this.input.value = "";
    this.updateState();
    if (this.onResolveCallback) {
      this.onResolveCallback("");
    }
  }

  public setDisabled(disabled: boolean) {
    this.input.disabled = disabled;
    this.clearBtn.disabled = disabled;
    this.pasteBtn.disabled = disabled;
  }

  private scheduleResolve() {
    window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.triggerResolveImmediately();
    }, 500);
  }

  private triggerResolveImmediately() {
    window.clearTimeout(this.debounceTimer);
    if (this.onResolveCallback) {
      this.onResolveCallback(this.getValue());
    }
  }
}
