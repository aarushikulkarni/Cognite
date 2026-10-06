import { siteIdForHost, todayKey } from "../shared/constants";
import { isMessage, type ExtensionMessage } from "../shared/messages";
import { applyCompletion } from "../shared/scoring";
import { loadState, patchState, saveState } from "../shared/storage";
import type { LiveStatus, StoredState } from "../shared/types";

const ALARM = "cognite-tick";

function hostnameFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isEnabledSite(state: StoredState, siteId: string | null): siteId is string {
  return Boolean(siteId && state.settings.enabledSiteIds.includes(siteId));
}

async function getActiveTrackedSite(): Promise<{
  tabId: number | null;
  siteId: string | null;
  focused: boolean;
}> {
  const windows = await chrome.windows.getAll({ populate: false });
  const focusedWindow = windows.find((w) => w.focused && w.type === "normal");
  if (!focusedWindow) return { tabId: null, siteId: null, focused: false };

  const [tab] = await chrome.tabs.query({
    active: true,
    windowId: focusedWindow.id,
  });
  const host = hostnameFromUrl(tab?.url);
  const siteId = host ? siteIdForHost(host) : null;
  return { tabId: tab?.id ?? null, siteId, focused: true };
}

function liveStatus(state: StoredState, activeSiteId: string | null): LiveStatus {
  const thresholdMs = state.settings.thresholdMinutes * 60_000;
  const activeSiteMs = activeSiteId ? (state.timer.perSiteMs[activeSiteId] ?? 0) : 0;
  const remainingMs =
    activeSiteId && isEnabledSite(state, activeSiteId)
      ? Math.max(0, thresholdMs - activeSiteMs)
      : null;
  return {
    settings: state.settings,
    progress: state.progress,
    activeSiteId,
    activeSiteMs,
    remainingMs,
    overlayPending: Boolean(
      activeSiteId && state.timer.overlayShownSiteIds.includes(activeSiteId),
    ),
  };
}

function rolloverTimer(state: StoredState): void {
  const today = todayKey();
  if (state.timer.date !== today) {
    state.timer = {
      date: today,
      perSiteMs: {},
      lastTick: null,
      lastSiteId: null,
      overlayShownSiteIds: [],
    };
  }
  if (state.progress.completionsTodayDate !== today) {
    state.progress.completionsToday = 0;
    state.progress.completionsTodayDate = today;
  }
}

async function maybePrompt(state: StoredState, tabId: number | null, siteId: string | null) {
  if (!tabId || !isEnabledSite(state, siteId)) return;
  const thresholdMs = state.settings.thresholdMinutes * 60_000;
  const used = state.timer.perSiteMs[siteId] ?? 0;
  if (used < thresholdMs) return;
  if (state.timer.overlayShownSiteIds.includes(siteId)) return;

  state.timer.overlayShownSiteIds = [...state.timer.overlayShownSiteIds, siteId];
  await saveState(state);
  const minutes = Math.round(used / 60_000);
  const message: ExtensionMessage = {
    type: "THRESHOLD_REACHED",
    payload: {
      siteId,
      minutes,
      durationMinutes: state.settings.durationMinutes,
    },
  };
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script may not be ready yet; it can request status on load.
  }
}

async function tick(): Promise<void> {
  const state = await loadState();
  rolloverTimer(state);
  const now = Date.now();
  const { tabId, siteId, focused } = await getActiveTrackedSite();
  const tracked = focused && isEnabledSite(state, siteId) ? siteId : null;

  if (state.timer.lastTick && state.timer.lastSiteId) {
    const delta = Math.min(now - state.timer.lastTick, 30_000);
    if (delta > 0) {
      const prev = state.timer.perSiteMs[state.timer.lastSiteId] ?? 0;
      state.timer.perSiteMs[state.timer.lastSiteId] = prev + delta;
    }
  }

  state.timer.lastTick = now;
  state.timer.lastSiteId = tracked;
  await saveState(state);
  await maybePrompt(state, tabId, tracked);
}

function resetSiteTimer(state: StoredState, siteId: string) {
  const { [siteId]: _, ...rest } = state.timer.perSiteMs;
  state.timer.perSiteMs = rest;
  state.timer.overlayShownSiteIds = state.timer.overlayShownSiteIds.filter((id) => id !== siteId);
  if (state.timer.lastSiteId === siteId) {
    state.timer.lastSiteId = null;
    state.timer.lastTick = null;
  }
}

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (message.type === "GET_STATUS") {
    const state = await loadState();
    rolloverTimer(state);
    const { siteId } = await getActiveTrackedSite();
    const tracked = isEnabledSite(state, siteId) ? siteId : null;
    return liveStatus(state, tracked);
  }

  if (message.type === "SKIP_INTERVENTION") {
    const next = await patchState((state) => {
      resetSiteTimer(state, message.payload.siteId);
      const applied = applyCompletion(state.progress, {
        skipped: true,
        grade: null,
        siteId: message.payload.siteId,
        title: null,
        passageMarkdown: null,
        usedFixture: false,
      });
      state.progress = applied.progress;
    });
    return liveStatus(next, message.payload.siteId);
  }

  if (message.type === "START_INTERVENTION") {
    await patchState((state) => {
      resetSiteTimer(state, message.payload.siteId);
    });
    await chrome.storage.session.set({ pendingSiteId: message.payload.siteId });
    await chrome.tabs.create({
      url: chrome.runtime.getURL("intervention.html"),
    });
    return { ok: true };
  }

  if (message.type === "INTERVENTION_COMPLETE") {
    const next = await patchState((state) => {
      const applied = applyCompletion(state.progress, message.payload);
      state.progress = applied.progress;
    });
    await chrome.storage.session.remove("pendingSiteId");
    return next.progress;
  }

  if (message.type === "SETTINGS_UPDATED") {
    await tick();
    return { ok: true };
  }

  void sender;
  return undefined;
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await loadState();
  await saveState(state);
  await chrome.alarms.create(ALARM, { periodInMinutes: 0.25 });
  if (!state.settings.onboardingComplete) {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.alarms.create(ALARM, { periodInMinutes: 0.25 });
  await tick();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void tick();
});

chrome.tabs.onActivated.addListener(() => {
  void tick();
});

chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.status === "complete" || change.url) void tick();
});

chrome.windows.onFocusChanged.addListener(() => {
  void tick();
});

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (!isMessage(raw)) return;
  void handleMessage(raw, sender)
    .then(sendResponse)
    .catch((err: unknown) => {
      sendResponse({ error: err instanceof Error ? err.message : "unknown" });
    });
  return true;
});

void tick();
