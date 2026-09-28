import { todayKey, yesterdayKey } from "./constants";
import type { GradeResult, Progress, SessionRecord } from "./types";

const COMPLETE_XP = 20;
const COMPLETE_REPEAT_XP = 10;
const ACCURACY_XP_MAX = 15;
const STREAK_XP = 5;
const MAX_SESSIONS = 20;

export function applyCompletion(progress: Progress, input: {
  skipped: boolean;
  grade: GradeResult | null;
  siteId: string | null;
  title: string | null;
  passageMarkdown: string | null;
  usedFixture: boolean;
}): { progress: Progress; xpDelta: number } {
  const today = todayKey();
  const next: Progress = { ...progress, sessions: [...progress.sessions] };

  if (next.completionsTodayDate !== today) {
    next.completionsToday = 0;
    next.completionsTodayDate = today;
  }

  let xpDelta = 0;
  let accuracy: number | null = null;

  if (input.skipped) {
    xpDelta = 0;
  } else if (input.grade) {
    accuracy = input.grade.total
      ? input.grade.correctCount / input.grade.total
      : 0;
    const baseComplete =
      next.completionsToday >= 1 ? COMPLETE_REPEAT_XP : COMPLETE_XP;
    const accuracyXp = Math.round(
      ACCURACY_XP_MAX * (input.grade.correctCount / Math.max(input.grade.total, 1)),
    );
    xpDelta = baseComplete + accuracyXp;

    const last = next.lastCompletionDate;
    if (last === yesterdayKey() || last === today) {
      if (last === yesterdayKey()) {
        next.streak = (next.streak || 0) + 1;
        xpDelta += STREAK_XP;
      }
    } else {
      next.streak = 1;
    }

    next.lastCompletionDate = today;
    next.completionsToday += 1;
    next.lastPassageTitle = input.title;
    next.lastPassageMarkdown = input.passageMarkdown;
  }

  next.xp += xpDelta;
  next.cognitiveScore += xpDelta;

  const session: SessionRecord = {
    timestamp: Date.now(),
    skipped: input.skipped,
    accuracy,
    xp: xpDelta,
    siteId: input.siteId,
    usedFixture: input.usedFixture,
  };
  next.sessions = [session, ...next.sessions].slice(0, MAX_SESSIONS);

  return { progress: next, xpDelta };
}
