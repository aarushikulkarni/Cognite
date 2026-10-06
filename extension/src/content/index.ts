import { DEFAULT_SITES } from "../shared/constants";
import { isMessage, type ExtensionMessage } from "../shared/messages";
import type { LiveStatus } from "../shared/types";

const ROOT_ID = "cognite-overlay-root";

function safeSendMessage<T>(message: ExtensionMessage): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (!chrome.runtime?.id) {
      resolve(undefined);
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(undefined);
        return;
      }
      resolve(response as T | undefined);
    });
  });
}

function siteLabel(siteId: string): string {
  return DEFAULT_SITES.find((s) => s.id === siteId)?.label ?? siteId;
}

function ensureOverlay(): HTMLDivElement {
  const existing = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (existing) return existing;
  const host = document.createElement("div");
  host.id = ROOT_ID;
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483646";
  host.style.right = "16px";
  host.style.bottom = "16px";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .panel {
        width: min(360px, calc(100vw - 32px));
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: #f4ece2;
        background: #1e1914;
        border: 1px solid rgba(244, 236, 226, 0.14);
        border-radius: 18px;
        box-shadow: 0 18px 50px rgba(0,0,0,.4);
        padding: 16px 16px 14px;
        display: none;
      }
      .panel.open { display: block; }
      .kicker {
        text-transform: uppercase;
        letter-spacing: .16em;
        font-size: 10px;
        color: #f0c07a;
        margin: 0 0 6px;
      }
      h2 { font-size: 18px; margin: 0 0 8px; }
      p { margin: 0 0 12px; color: #b9a894; font-size: 13px; line-height: 1.45; }
      .row { display: flex; gap: 8px; }
      button {
        font: inherit;
        border: 0;
        border-radius: 999px;
        padding: 8px 12px;
        cursor: pointer;
      }
      .start { background: #e08a3c; color: #1a120c; font-weight: 650; }
      .skip { background: transparent; color: #f4ece2; border: 1px solid rgba(244,236,226,.2); }
    </style>
    <div class="panel" id="panel">
      <p class="kicker">Cognite</p>
      <h2>Reignite your cognition</h2>
      <p id="copy"></p>
      <div class="row">
        <button class="start" id="start">Start reading</button>
        <button class="skip" id="skip">Skip</button>
      </div>
    </div>
  `;
  return host;
}

function showOverlay(payload: { siteId: string; minutes: number; durationMinutes: number }) {
  const host = ensureOverlay();
  const shadow = host.shadowRoot;
  if (!shadow) return;
  const panel = shadow.getElementById("panel");
  const copy = shadow.getElementById("copy");
  const start = shadow.getElementById("start");
  const skip = shadow.getElementById("skip");
  if (!panel || !copy || !start || !skip) return;

  copy.textContent = `You've been on ${siteLabel(payload.siteId)} for about ${payload.minutes} min. Take a voluntary ${payload.durationMinutes}-minute reading challenge, or skip. Cognite tracks time on sites you selected — not page content, and not brain activity.`;
  panel.classList.add("open");

  start.onclick = () => {
    panel.classList.remove("open");
    const msg: ExtensionMessage = {
      type: "START_INTERVENTION",
      payload: { siteId: payload.siteId },
    };
    void safeSendMessage(msg);
  };
  skip.onclick = () => {
    panel.classList.remove("open");
    const msg: ExtensionMessage = {
      type: "SKIP_INTERVENTION",
      payload: { siteId: payload.siteId },
    };
    void safeSendMessage(msg);
  };
}

chrome.runtime.onMessage.addListener((raw) => {
  if (!chrome.runtime?.id) return;
  if (!isMessage(raw) || raw.type !== "THRESHOLD_REACHED") return;
  showOverlay(raw.payload);
});

void safeSendMessage<LiveStatus>({ type: "GET_STATUS" }).then((status) => {
  if (!status?.overlayPending || !status.activeSiteId) return;
  const minutes = Math.max(1, Math.round(status.activeSiteMs / 60_000));
  showOverlay({
    siteId: status.activeSiteId,
    minutes,
    durationMinutes: status.settings.durationMinutes,
  });
});
