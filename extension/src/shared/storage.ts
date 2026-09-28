import {
  DEFAULT_SITES,
  INTERESTS,
  todayKey,
  type Interest,
} from "./constants";
import type { Progress, Settings, StoredState, TimerState } from "./types";

const STORAGE_KEY = "cognite";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function defaultSettings(): Settings {
  return {
    onboardingComplete: false,
    interests: [...INTERESTS] as Interest[],
    durationMinutes: 4,
    thresholdMinutes: 1,
    enabledSiteIds: DEFAULT_SITES.map((s) => s.id),
  };
}

export function defaultProgress(): Progress {
  return {
    installId: uuid(),
    cognitiveScore: 0,
    xp: 0,
    streak: 0,
    lastCompletionDate: null,
    completionsToday: 0,
    completionsTodayDate: todayKey(),
    sessions: [],
    lastPassageTitle: null,
    lastPassageMarkdown: null,
  };
}

export function defaultTimer(): TimerState {
  return {
    date: todayKey(),
    perSiteMs: {},
    lastTick: null,
    lastSiteId: null,
    overlayShownSiteIds: [],
  };
}

export async function loadState(): Promise<StoredState> {
  const raw = await chrome.storage.local.get(STORAGE_KEY);
  const stored = raw[STORAGE_KEY] as Partial<StoredState> | undefined;
  return {
    settings: { ...defaultSettings(), ...stored?.settings },
    progress: { ...defaultProgress(), ...stored?.progress },
    timer: { ...defaultTimer(), ...stored?.timer },
  };
}

export async function saveState(state: StoredState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export async function patchState(
  patcher: (state: StoredState) => StoredState | void,
): Promise<StoredState> {
  const state = await loadState();
  const next = patcher(state) ?? state;
  await saveState(next);
  return next;
}
