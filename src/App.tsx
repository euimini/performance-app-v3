import { useMemo, useState } from "react";
import type { SessionDraft } from "./domain/session/types";
import { ScreenTabs } from "./components/common/ScreenTabs";
import { createPlannerOutput } from "./engines/sessionPlannerEngine";
import { loadOnboardingProfile } from "./repositories/onboardingProfileRepository";
import {
  appendRecoveryLog,
  defaultRawLogs,
  loadRawLogs,
  saveRawLogs,
  upsertSessionLog
} from "./repositories/rawLogsRepository";
import { loadSessionDraft, saveSessionDraft } from "./repositories/sessionDraftRepository";
import { removeStorage } from "./store/localStore";
import { HomeScreen } from "./screens/home/HomeScreen";
import { RecordsScreen } from "./screens/records/RecordsScreen";
import { RecoveryNutritionScreen } from "./screens/recovery-nutrition/RecoveryNutritionScreen";
import { TodaySessionScreen } from "./screens/today-session/TodaySessionScreen";

const today = "2026-03-29";

type ScreenKey = "home" | "today" | "recovery" | "records";
type ScenarioKey = "기본" | "근육통 높음" | "회복 우선" | "미완료 2회";

const addDays = (date: string, amount: number) => {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + amount);
  return next.toISOString().slice(0, 10);
};

const buildCalendarDays = (baseDate: string, completedDates: Set<string>) => {
  const firstDay = new Date(`${baseDate}T00:00:00`);
  firstDay.setDate(1);
  const month = firstDay.getMonth();
  const startOffset = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 35 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const date = day.toISOString().slice(0, 10);

    return {
      date,
      dayNumber: day.getDate(),
      inMonth: day.getMonth() === month,
      completed: completedDates.has(date)
    };
  });
};

const App = () => {
  const [screen, setScreen] = useState<ScreenKey>("home");
  const [rawLogs, setRawLogs] = useState(() => loadRawLogs());
  const [draft, setDraft] = useState<SessionDraft | undefined>(() => loadSessionDraft());
  const profile = useMemo(() => loadOnboardingProfile(), []);

  const plannerOutput = useMemo(
    () =>
      createPlannerOutput({
        date: today,
        profile,
        recoveryState: rawLogs.recoveryLogs.at(-1),
        sessionLogs: rawLogs.sessionLogs,
        sessionDraft: draft
      }),
    [draft, profile, rawLogs]
  );

  const trainingWindow = useMemo(
    () =>
      [
        { label: "어제", date: addDays(today, -1) },
        { label: "오늘", date: today },
        { label: "내일", date: addDays(today, 1) }
      ].map((item) => {
        const plan = createPlannerOutput({
          date: item.date,
          profile,
          recoveryState: rawLogs.recoveryLogs.at(-1),
          sessionLogs: rawLogs.sessionLogs
        });

        return {
          ...item,
          sessionName: plan.hero.세션명,
          summary: plan.hero.요약문구,
          exercises: plan.hero.운동목록.slice(0, 4)
        };
      }),
    [profile, rawLogs]
  );

  const completedDates = useMemo(
    () => new Set(rawLogs.sessionLogs.filter((log) => log.completed).map((log) => log.date)),
    [rawLogs.sessionLogs]
  );

  const calendarDays = useMemo(() => buildCalendarDays(today, completedDates), [completedDates]);

  const updateDraft = (intensity: "정상" | "가볍게" | "회복") => {
    const selectedPlanId =
      intensity === "회복"
        ? plannerOutput.recovery.id
        : intensity === "가볍게"
          ? plannerOutput.reduced.id
          : plannerOutput.today.id;

    const nextDraft: SessionDraft = {
      date: today,
      selectedPlanId,
      selectedIntensity: intensity,
      startedAt: new Date().toISOString()
    };

    setDraft(nextDraft);
    saveSessionDraft(nextDraft);
  };

  const handleQuickRecovery = (fatigue: number, doms: number, sleepHours: number) => {
    setRawLogs(
      appendRecoveryLog({
        date: today,
        피로도: fatigue,
        근육통: doms,
        수면시간: sleepHours
      })
    );
  };

  const applyScenario = (scenario: ScenarioKey) => {
    let nextLogs = defaultRawLogs;

    if (scenario === "근육통 높음") {
      nextLogs = {
        ...defaultRawLogs,
        recoveryLogs: [
          ...defaultRawLogs.recoveryLogs,
          { date: today, 피로도: 6, 근육통: 7, 수면시간: 6, 메모: "하체 근육통이 큼" }
        ]
      };
    }

    if (scenario === "회복 우선") {
      nextLogs = {
        ...defaultRawLogs,
        recoveryLogs: [
          ...defaultRawLogs.recoveryLogs,
          { date: today, 피로도: 9, 근육통: 8, 수면시간: 5, 메모: "전신 피로가 큼" }
        ]
      };
    }

    if (scenario === "미완료 2회") {
      nextLogs = {
        ...defaultRawLogs,
        sessionLogs: [
          ...defaultRawLogs.sessionLogs,
          {
            date: "2026-03-28",
            sessionTemplateId: "lean-mobility",
            completed: false,
            intensity: "정상"
          }
        ],
        recoveryLogs: [
          ...defaultRawLogs.recoveryLogs,
          { date: today, 피로도: 6, 근육통: 5, 수면시간: 6, 메모: "이틀 연속 루틴을 놓침" }
        ]
      };
    }

    saveRawLogs(nextLogs);
    setRawLogs(nextLogs);
    setDraft(undefined);
    removeStorage("performance-app-v3/session-draft");
  };

  const toggleCalendarComplete = (date: string) => {
    const existing = rawLogs.sessionLogs.find((log) => log.date === date);
    const sessionTemplateId = existing?.sessionTemplateId ?? plannerOutput.today.id.replace("-normal", "");
    const next = upsertSessionLog({
      date,
      sessionTemplateId,
      completed: !existing?.completed,
      intensity: existing?.intensity ?? "정상"
    });

    setRawLogs(next);
  };

  return (
    <main className="app-shell">
      <ScreenTabs current={screen} onChange={setScreen} />

      {screen === "home" ? (
        <HomeScreen
          plannerOutput={plannerOutput}
          draft={draft}
          onStart={() => setScreen("today")}
          trainingWindow={trainingWindow}
        />
      ) : null}

      {screen === "today" ? (
        <TodaySessionScreen
          plannerOutput={plannerOutput}
          draft={draft}
          onIntensityChange={updateDraft}
        />
      ) : null}

      {screen === "recovery" ? (
        <RecoveryNutritionScreen
          recoveryState={rawLogs.recoveryLogs.at(-1)}
          onQuickUpdate={handleQuickRecovery}
        />
      ) : null}

      {screen === "records" ? (
        <RecordsScreen
          sessionLogs={rawLogs.sessionLogs}
          calendarDays={calendarDays}
          onToggleComplete={toggleCalendarComplete}
        />
      ) : null}
    </main>
  );
};

export default App;
