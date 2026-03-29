import type { SessionVersion } from "../session/types";

export type SessionQuality = "clean" | "managed" | "failed";
export type MissedSessionReason = "schedule" | "fatigue" | "soreness" | "pain" | "illness";

export type SessionLog = {
  date: string;
  sessionId: string;
  baseSessionId: string;
  completed: boolean;
  version: SessionVersion;
  quality: SessionQuality;
  missedReason?: MissedSessionReason;
};
