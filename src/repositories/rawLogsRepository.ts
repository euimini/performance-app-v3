import type { MissedSessionReason, SessionLog } from "../domain/records/SessionLog";
import type { RecoveryState } from "../domain/recovery/RecoveryState";
import type { SessionVersion } from "../domain/session/types";
import { readStorage, writeStorage } from "../store/localStore";

const RAW_LOGS_KEY = "performance-app-v3/raw-logs";
const LEGACY_SEED_DATES = new Set(["2026-03-26", "2026-03-27"]);

export type RawLogsStore = {
  recoveryLogs: RecoveryState[];
  sessionLogs: SessionLog[];
};

export const defaultRawLogs: RawLogsStore = {
  recoveryLogs: [],
  sessionLogs: []
};

type LegacyRecoveryLog = {
  date: string;
  fatigue?: number;
  upperDoms?: number;
  lowerDoms?: number;
  shoulderStress?: number;
  sleepHours?: number;
  memo?: string;
  ["피로도"]?: number;
  ["근육통"]?: number;
  ["수면시간"]?: number;
  ["메모"]?: string;
};

type LegacySessionLog = {
  date: string;
  sessionId?: string;
  baseSessionId?: string;
  completed: boolean;
  version?: SessionVersion;
  quality?: "clean" | "managed" | "failed";
  missedReason?: MissedSessionReason;
  reason?: MissedSessionReason;
  sessionTemplateId?: string;
  intensity?: "정상" | "가볍게" | "회복";
};

const normalizeVersion = (
  value?: SessionVersion | "정상" | "가볍게" | "회복"
): SessionVersion => {
  if (value === "reduced" || value === "가볍게") {
    return "reduced";
  }

  if (value === "recovery" || value === "회복") {
    return "recovery";
  }

  return "normal";
};

const normalizeRecoveryLog = (log: LegacyRecoveryLog): RecoveryState => {
  const fallbackDoms = log["근육통"] ?? 4;

  return {
    date: log.date,
    fatigue: log.fatigue ?? log["피로도"] ?? 5,
    upperDoms: log.upperDoms ?? fallbackDoms,
    lowerDoms: log.lowerDoms ?? fallbackDoms,
    shoulderStress: log.shoulderStress ?? 4,
    sleepHours: log.sleepHours ?? log["수면시간"] ?? 7,
    memo: log.memo ?? log["메모"]
  };
};

const normalizeSessionLog = (log: LegacySessionLog): SessionLog => {
  const legacyId = log.baseSessionId ?? log.sessionId ?? log.sessionTemplateId ?? "pull-strength";
  const version = normalizeVersion(log.version ?? log.intensity);

  return {
    date: log.date,
    sessionId: log.sessionId ?? `${legacyId}-${version}`,
    baseSessionId: legacyId,
    completed: log.completed,
    version,
    quality: log.quality ?? (log.completed ? "clean" : "failed"),
    missedReason: log.missedReason ?? log.reason
  };
};

const dedupeRecoveryLogsByDate = (logs: RecoveryState[]) => {
  const map = new Map<string, RecoveryState>();
  logs.forEach((log) => map.set(log.date, log));
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
};

const dedupeSessionLogsByDate = (logs: SessionLog[]) => {
  const map = new Map<string, SessionLog>();
  logs.forEach((log) => map.set(log.date, log));
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
};

const sanitizeRawLogs = (store: Partial<RawLogsStore>): RawLogsStore => {
  const recoveryLogs = dedupeRecoveryLogsByDate(
    (store.recoveryLogs ?? [])
      .map((log) => normalizeRecoveryLog(log as LegacyRecoveryLog))
      .filter((log) => !LEGACY_SEED_DATES.has(log.date))
  );
  const sessionLogs = dedupeSessionLogsByDate(
    (store.sessionLogs ?? [])
      .map((log) => normalizeSessionLog(log as LegacySessionLog))
      .filter((log) => !LEGACY_SEED_DATES.has(log.date))
  );

  return { recoveryLogs, sessionLogs };
};

export const loadRawLogs = (): RawLogsStore => {
  const saved = readStorage<Partial<RawLogsStore>>(RAW_LOGS_KEY);
  if (!saved) {
    writeStorage(RAW_LOGS_KEY, defaultRawLogs);
    return defaultRawLogs;
  }

  const sanitized = sanitizeRawLogs(saved);
  writeStorage(RAW_LOGS_KEY, sanitized);
  return sanitized;
};

export const saveRawLogs = (store: RawLogsStore) => {
  writeStorage(RAW_LOGS_KEY, sanitizeRawLogs(store));
};

export const upsertRecoveryLog = (log: RecoveryState) => {
  const current = loadRawLogs();
  const next: RawLogsStore = {
    ...current,
    recoveryLogs: dedupeRecoveryLogsByDate([
      ...current.recoveryLogs.filter((entry) => entry.date !== log.date),
      log
    ])
  };

  saveRawLogs(next);
  return next;
};

export const removeRecoveryLogByDate = (date: string) => {
  const current = loadRawLogs();
  const next: RawLogsStore = {
    ...current,
    recoveryLogs: current.recoveryLogs.filter((entry) => entry.date !== date)
  };

  saveRawLogs(next);
  return next;
};

export const upsertSessionLog = (log: SessionLog) => {
  const current = loadRawLogs();
  const next: RawLogsStore = {
    ...current,
    sessionLogs: dedupeSessionLogsByDate([
      ...current.sessionLogs.filter((entry) => entry.date !== log.date),
      log
    ])
  };

  saveRawLogs(next);
  return next;
};

export const removeSessionLogsByDate = (date: string) => {
  const current = loadRawLogs();
  const next: RawLogsStore = {
    ...current,
    sessionLogs: current.sessionLogs.filter((entry) => entry.date !== date)
  };

  saveRawLogs(next);
  return next;
};
