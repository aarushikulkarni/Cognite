import type { DurationMinutes, Interest, ThresholdMinutes } from "./constants";

export type SessionRecord = {
  timestamp: number;
  skipped: boolean;
  accuracy: number | null;
  xp: number;
  siteId: string | null;
  usedFixture: boolean;
};

export type Settings = {
  onboardingComplete: boolean;
  interests: Interest[];
  durationMinutes: DurationMinutes;
  thresholdMinutes: ThresholdMinutes;
  enabledSiteIds: string[];
};

export type Progress = {
  installId: string;
  cognitiveScore: number;
  xp: number;
  streak: number;
  lastCompletionDate: string | null;
  completionsToday: number;
  completionsTodayDate: string;
  sessions: SessionRecord[];
  lastPassageTitle: string | null;
  lastPassageMarkdown: string | null;
};

export type TimerState = {
  date: string;
  perSiteMs: Record<string, number>;
  lastTick: number | null;
  lastSiteId: string | null;
  overlayShownSiteIds: string[];
};

export type StoredState = {
  settings: Settings;
  progress: Progress;
  timer: TimerState;
};

export type LiveStatus = {
  settings: Settings;
  progress: Progress;
  activeSiteId: string | null;
  activeSiteMs: number;
  remainingMs: number | null;
  overlayPending: boolean;
};

export type QuizChoice = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  choices: QuizChoice[];
};

export type InterventionPayload = {
  id: string;
  title: string;
  passageMarkdown: string;
  estimatedMinutes: number;
  questions: QuizQuestion[];
  usedFixture: boolean;
};

export type GradeResult = {
  scorePct: number;
  correctCount: number;
  total: number;
  perQuestion: { questionId: string; correct: boolean; correctChoiceId: string }[];
  xpAwarded: number;
};
