import { useMemo, useState } from "react";
import type { MissedSessionReason } from "./domain/records/SessionLog";
import type { RecoveryState } from "./domain/recovery/RecoveryState";
import type { SessionDraft, SessionVersion } from "./domain/session/types";
import { ScreenTabs } from "./components/common/ScreenTabs";
import { createPlannerOutput, createWeeklyPlannerOutput } from "./engines/sessionPlannerEngine";
import { loadOnboardingProfile } from "./repositories/onboardingProfileRepository";
import {
  loadRawLogs,
  removeRecoveryLogByDate,
  removeSessionLogsByDate,
  upsertRecoveryLog,
  upsertSessionLog
} from "./repositories/rawLogsRepository";
import {
  clearSessionDraft,
  loadSessionDraft,
  saveSessionDraft
} from "./repositories/sessionDraftRepository";
import { HomeScreen } from "./screens/home/HomeScreen";
import { RecordsScreen } from "./screens/records/RecordsScreen";
import { RecoveryNutritionScreen } from "./screens/recovery-nutrition/RecoveryNutritionScreen";
import { TodaySessionScreen } from "./screens/today-session/TodaySessionScreen";

const today = "2026-03-29";

type ScreenKey = "home" | "today" | "recovery" | "records";

const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildCalendarDays = (baseDate: string, completedDates: Set<string>) => {
  const firstDay = parseLocalDate(baseDate);
  firstDay.setDate(1);
  const month = firstDay.getMonth();
  const startOffset = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 35 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const date = formatLocalDate(day);

    return {
      date,
      dayNumber: day.getDate(),
      inMonth: day.getMonth() === month,
      completed: completedDates.has(date)
    };
  });
};

const getRecoveryForDate = (logs: RecoveryState[], date: string) =>
  [...logs]
    .filter((entry) => entry.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);

const App = () => {
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [rawLogs, setRawLogs] = useState(() => loadRawLogs());
  const [draft, setDraft] = useState<SessionDraft | undefined>(() => loadSessionDraft());
  const [todaySessionResetKey, setTodaySessionResetKey] = useState(0);
  const profile = useMemo(() => loadOnboardingProfile(), []);

  const plannerOutput = useMemo(
    () =>
      createPlannerOutput({
        date: today,
        profile,
        recoveryState: getRecoveryForDate(rawLogs.recoveryLogs, today),
        sessionLogs: rawLogs.sessionLogs,
        sessionDraft: draft
      }),
    [draft, profile, rawLogs]
  );

  const weeklyPlan = useMemo(
    () =>
      createWeeklyPlannerOutput(
        {
          date: today,
          profile,
          recoveryState: getRecoveryForDate(rawLogs.recoveryLogs, today),
          sessionLogs: rawLogs.sessionLogs
        },
        today,
        (date) => getRecoveryForDate(rawLogs.recoveryLogs, date)
      ),
    [profile, rawLogs]
  );

  const completedDates = useMemo(
    () => new Set(rawLogs.sessionLogs.filter((log) => log.completed).map((log) => log.date)),
    [rawLogs.sessionLogs]
  );

  const calendarDays = useMemo(() => buildCalendarDays(today, completedDates), [completedDates]);

  const updateDraft = (version: SessionVersion) => {
    const selectedSession = plannerOutput.availablePlans[version];
    const nextDraft: SessionDraft = {
      date: today,
      selectedSessionId: selectedSession.id,
      selectedVersion: version,
      startedAt: new Date().toISOString()
    };

    setDraft(nextDraft);
    saveSessionDraft(nextDraft);
  };

  const handleRecoverySave = (payload: {
    fatigue: number;
    upperDoms: number;
    lowerDoms: number;
    shoulderStress: number;
    sleepHours: number;
    memo?: string;
  }) => {
    setRawLogs(
      upsertRecoveryLog({
        date: today,
        fatigue: payload.fatigue,
        upperDoms: payload.upperDoms,
        lowerDoms: payload.lowerDoms,
        shoulderStress: payload.shoulderStress,
        sleepHours: payload.sleepHours,
        memo: payload.memo
      })
    );
  };

  const resetTodaySession = () => {
    setDraft(undefined);
    clearSessionDraft();
    setTodaySessionResetKey((current) => current + 1);
  };

  const completeTodaySession = () => {
    const selectedVersion = draft?.selectedVersion ?? plannerOutput.todayPlan.version;
    const selectedPlan = plannerOutput.availablePlans[selectedVersion];

    setRawLogs(
      upsertSessionLog({
        date: today,
        sessionId: selectedPlan.id,
        baseSessionId: selectedPlan.baseSessionId,
        completed: true,
        version: selectedVersion,
        quality: selectedVersion === "normal" ? "clean" : "managed"
      })
    );
  };

  const markTodaySessionMissed = (missedReason: MissedSessionReason) => {
    const selectedVersion = draft?.selectedVersion ?? plannerOutput.todayPlan.version;
    const selectedPlan = plannerOutput.availablePlans[selectedVersion];

    setRawLogs(
      upsertSessionLog({
        date: today,
        sessionId: selectedPlan.id,
        baseSessionId: selectedPlan.baseSessionId,
        completed: false,
        version: selectedVersion,
        quality: "failed",
        missedReason
      })
    );
  };

  const resetTodayRecord = () => {
    const withoutRecovery = removeRecoveryLogByDate(today);
    const withoutSessionLogs = removeSessionLogsByDate(today);

    setRawLogs({
      recoveryLogs: withoutRecovery.recoveryLogs,
      sessionLogs: withoutSessionLogs.sessionLogs
    });
    setDraft(undefined);
    clearSessionDraft();
    setTodaySessionResetKey((current) => current + 1);
  };

  const toggleCalendarComplete = (date: string) => {
    const existing = rawLogs.sessionLogs.find((log) => log.date === date);
    if (existing) {
      setRawLogs(upsertSessionLog({ ...existing, completed: !existing.completed }));
      return;
    }

    const planForDate = createPlannerOutput({
      date,
      profile,
      recoveryState: getRecoveryForDate(rawLogs.recoveryLogs, date),
      sessionLogs: rawLogs.sessionLogs
    });

    setRawLogs(
      upsertSessionLog({
        date,
        sessionId: planForDate.todayPlan.id,
        baseSessionId: planForDate.todayPlan.baseSessionId,
        completed: true,
        version: planForDate.todayPlan.version,
        quality: "managed"
      })
    );
  };

  return (
    <main className="app-shell">
      <ScreenTabs current={screen} onChange={setScreen} />

      {screen === "home" ? (
        <HomeScreen
          plannerOutput={plannerOutput}
          weeklyPlan={weeklyPlan}
          draft={draft}
          onStart={() => setScreen("today")}
        />
      ) : null}

      {screen === "today" ? (
        <TodaySessionScreen
          plannerOutput={plannerOutput}
          draft={draft}
          onVersionChange={updateDraft}
          onComplete={completeTodaySession}
          onMarkMissed={markTodaySessionMissed}
          onReset={resetTodaySession}
          resetKey={todaySessionResetKey}
        />
      ) : null}

      {screen === "recovery" ? (
        <RecoveryNutritionScreen
          date={today}
          recoveryState={getRecoveryForDate(rawLogs.recoveryLogs, today)}
          recoveryHistory={[...rawLogs.recoveryLogs].reverse().slice(0, 5)}
          recommendedVersion={plannerOutput.todayPlan.version}
          onSave={handleRecoverySave}
        />
      ) : null}

      {screen === "records" ? (
        <RecordsScreen
          calendarDays={calendarDays}
          onToggleComplete={toggleCalendarComplete}
          onResetToday={resetTodayRecord}
        />
      ) : null}
    </main>
  );
};

export default App;
