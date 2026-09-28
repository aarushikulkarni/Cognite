export const INTERESTS = [
  "technology",
  "science",
  "history",
  "philosophy",
  "arts",
] as const;

export type Interest = (typeof INTERESTS)[number];

export const INTEREST_LABELS: Record<Interest, string> = {
  technology: "Technology",
  science: "Science",
  history: "History",
  philosophy: "Philosophy",
  arts: "Arts",
};

export const DURATION_OPTIONS = [3, 4, 5] as const;
export type DurationMinutes = (typeof DURATION_OPTIONS)[number];

/** 1 minute is for local demos; production-feel defaults are 10/15/20. */
export const THRESHOLD_OPTIONS = [1, 10, 15, 20] as const;
export type ThresholdMinutes = (typeof THRESHOLD_OPTIONS)[number];

export type TrackedSite = {
  id: string;
  label: string;
  hosts: string[];
};

export const DEFAULT_SITES: TrackedSite[] = [
  { id: "youtube", label: "YouTube", hosts: ["youtube.com"] },
  { id: "x", label: "X / Twitter", hosts: ["x.com", "twitter.com"] },
  { id: "reddit", label: "Reddit", hosts: ["reddit.com"] },
  { id: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { id: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { id: "facebook", label: "Facebook", hosts: ["facebook.com"] },
  { id: "netflix", label: "Netflix", hosts: ["netflix.com"] },
];

export const API_BASE = "http://127.0.0.1:8000";

export function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

export function siteIdForHost(hostname: string): string | null {
  const host = normalizeHost(hostname);
  for (const site of DEFAULT_SITES) {
    if (site.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      return site.id;
    }
  }
  return null;
}

export function hostsForSiteId(siteId: string): string[] {
  return DEFAULT_SITES.find((s) => s.id === siteId)?.hosts ?? [];
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function yesterdayKey(date = new Date()): string {
  const prior = new Date(date);
  prior.setDate(prior.getDate() - 1);
  return todayKey(prior);
}
