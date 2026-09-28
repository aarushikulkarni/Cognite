import type { GradeResult, LiveStatus } from "./types";

export type ExtensionMessage =
  | { type: "GET_STATUS" }
  | { type: "STATUS"; payload: LiveStatus }
  | {
      type: "THRESHOLD_REACHED";
      payload: { siteId: string; minutes: number; durationMinutes: number };
    }
  | { type: "SKIP_INTERVENTION"; payload: { siteId: string } }
  | { type: "START_INTERVENTION"; payload: { siteId: string } }
  | {
      type: "INTERVENTION_COMPLETE";
      payload: {
        siteId: string | null;
        skipped: boolean;
        grade: GradeResult | null;
        title: string | null;
        passageMarkdown: string | null;
        usedFixture: boolean;
      };
    }
  | { type: "SETTINGS_UPDATED" };

export function isMessage(value: unknown): value is ExtensionMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      typeof (value as { type: unknown }).type === "string",
  );
}
