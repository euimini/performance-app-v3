import type { RecoveryState } from "../domain/recovery/RecoveryState";
import type { SessionLog } from "../domain/records/SessionLog";
import { readStorage, writeStorage } from "../store/localStore";

const RAW_LOGS_KEY = "performance-app-v3/raw-logs";

export type RawLogsStore = {
  recoveryLogs: RecoveryState[];
  sessionLogs: SessionLog[];
};

export const defaultRawLogs: RawLogsStore = {
  recoveryLogs: [
    {
      date: "2026-03-28",
      피로도: 6,
      근육통: 4,
      수면시간: 6.5,
      메모: "하체가 약간 뻐근함"
    }
  ],
  sessionLogs: [
    {
      date: "2026-03-26",
      sessionTemplateId: "pull-growth",
      completed: true,
      intensity: "정상"
    },
    {
      date: "2026-03-27",
      sessionTemplateId: "fire-duty",
      completed: false,
      intensity: "정상"
    }
  ]
};

export const loadRawLogs = (): RawLogsStore => {
  const saved = readStorage<RawLogsStore>(RAW_LOGS_KEY);
  if (saved) {
    return saved;
  }

  writeStorage(RAW_LOGS_KEY, defaultRawLogs);
  return defaultRawLogs;
};

export const saveRawLogs = (store: RawLogsStore) => {
  writeStorage(RAW_LOGS_KEY, store);
};

export const appendRecoveryLog = (log: RecoveryState) => {
  const current = loadRawLogs();
  const next = {
    ...current,
    recoveryLogs: [...current.recoveryLogs, log]
  };
  saveRawLogs(next);
  return next;
};

export const upsertSessionLog = (log: SessionLog) => {
  const current = loadRawLogs();
  const existingIndex = current.sessionLogs.findIndex(
    (item) => item.date === log.date && item.sessionTemplateId === log.sessionTemplateId
  );

  const nextLogs = [...current.sessionLogs];
  if (existingIndex >= 0) {
    nextLogs[existingIndex] = log;
  } else {
    nextLogs.push(log);
  }

  const next = {
    ...current,
    sessionLogs: nextLogs.sort((a, b) => a.date.localeCompare(b.date))
  };

  saveRawLogs(next);
  return next;
};
