import { useEffect, useMemo, useState } from "react";
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
import {
  addDays,
  formatLocalDate,
  getMillisecondsUntilNextLocalDate,
  getTodayLocalDate,
  parseLocalDate
} from "./services/localDate";
import { HomeScreen } from "./screens/home/HomeScreen";
import { RecordsScreen } from "./screens/records/RecordsScreen";
import { RecoveryNutritionScreen } from "./screens/recovery-nutrition/RecoveryNutritionScreen";
import { TodaySessionScreen } from "./screens/today-session/TodaySessionScreen";

type ScreenKey = "home" | "today" | "recovery" | "records";

const buildCalendarDays = (
  baseDate: string,
  completedDates: Set<string>,
  missedDates: Set<string>
) => {
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
      completed: completedDates.has(date),
      missed: missedDates.has(date)
    };
  });
};

const getRecoveryForDate = (logs: RecoveryState[], date: string) =>
  [...logs]
    .filter((entry) => entry.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);

const getActiveDate = (today: string, completedDates: Set<string>) => {
  let current = today;

  for (let index = 0; index < 14; index += 1) {
    if (!completedDates.has(current)) {
      return current;
    }

    current = addDays(current, 1);
  }

  return current;
};

const App = () => {
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [today, setToday] = useState(() => getTodayLocalDate());
  const [rawLogs, setRawLogs] = useState(() => loadRawLogs());
  const [draft, setDraft] = useState<SessionDraft | undefined>(() => loadSessionDraft());
  const [todaySessionResetKey, setTodaySessionResetKey] = useState(0);
  const profile = useMemo(() => loadOnboardingProfile(), []);
  const completedDates = useMemo(
    () => new Set(rawLogs.sessionLogs.filter((log) => log.completed).map((log) => log.date)),
    [rawLogs.sessionLogs]
  );
  const activeDate = useMemo(() => getActiveDate(today, completedDates), [completedDates, today]);
  const activeDraft = draft?.date === activeDate ? draft : undefined;
  const currentRecovery = useMemo(
    () => getRecoveryForDate(rawLogs.recoveryLogs, activeDate),
    [activeDate, rawLogs.recoveryLogs]
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setToday(getTodayLocalDate());
    }, getMillisecondsUntilNextLocalDate());

    return () => window.clearTimeout(timerId);
  }, [today]);

  useEffect(() => {
    if (!draft || draft.date === activeDate) {
      return;
    }

    setDraft(undefined);
    clearSessionDraft();
    setTodaySessionResetKey((current) => current + 1);
  }, [activeDate, draft]);

  const plannerState = useMemo(() => {
    const plannerInput = {
      date: activeDate,
      profile,
      recoveryState: currentRecovery,
      sessionLogs: rawLogs.sessionLogs,
      sessionDraft: activeDraft
    };

    return {
      plannerOutput: createPlannerOutput(plannerInput),
      weeklyPlan: createWeeklyPlannerOutput(
        {
          date: activeDate,
          profile,
          recoveryState: currentRecovery,
          sessionLogs: rawLogs.sessionLogs
        },
        activeDate,
        (date) => getRecoveryForDate(rawLogs.recoveryLogs, date)
      )
    };
  }, [activeDate, activeDraft, currentRecovery, profile, rawLogs.recoveryLogs, rawLogs.sessionLogs]);

  const { plannerOutput, weeklyPlan } = plannerState;
  const missedDates = useMemo(
    () => new Set(rawLogs.sessionLogs.filter((log) => !log.completed).map((log) => log.date)),
    [rawLogs.sessionLogs]
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(today, completedDates, missedDates),
    [completedDates, missedDates, today]
  );

  const updateDraft = (version: SessionVersion) => {
    const selectedSession = plannerOutput.availablePlans[version];
    const nextDraft: SessionDraft = {
      date: activeDate,
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
    setDraft(undefined);
    clearSessionDraft();
  };

  const resetTodaySession = () => {
    setDraft(undefined);
    clearSessionDraft();
    setTodaySessionResetKey((current) => current + 1);
  };

  const completeTodaySession = () => {
    const selectedVersion = activeDraft?.selectedVersion ?? plannerOutput.todayPlan.version;
    const selectedPlan = plannerOutput.availablePlans[selectedVersion];

    setRawLogs(
      upsertSessionLog({
        date: activeDate,
        sessionId: selectedPlan.id,
        baseSessionId: selectedPlan.baseSessionId,
        completed: true,
        version: selectedVersion,
        quality: selectedVersion === "normal" ? "clean" : "managed"
      })
    );
    setDraft(undefined);
    clearSessionDraft();
  };

  const markTodaySessionMissed = (missedReason: MissedSessionReason) => {
    const selectedVersion = activeDraft?.selectedVersion ?? plannerOutput.todayPlan.version;
    const selectedPlan = plannerOutput.availablePlans[selectedVersion];

    setRawLogs(
      upsertSessionLog({
        date: activeDate,
        sessionId: selectedPlan.id,
        baseSessionId: selectedPlan.baseSessionId,
        completed: false,
        version: selectedVersion,
        quality: "failed",
        missedReason
      })
    );
    setDraft(undefined);
    clearSessionDraft();
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
          onStart={() => setScreen("today")}
        />
      ) : null}

      {screen === "today" ? (
        <TodaySessionScreen
          plannerOutput={plannerOutput}
          draft={activeDraft}
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
          recoveryState={currentRecovery}
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
