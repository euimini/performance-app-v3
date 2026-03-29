import type { MissedSessionReason, SessionLog } from "../domain/records/SessionLog";
import type { RecoveryState } from "../domain/recovery/RecoveryState";
import type {
  PlannerInput,
  PlannerOutput,
  PullProgressionStep,
  SessionPriority,
  SessionVersion,
  WeeklyPlanItem,
  WeeklyPlannerOutput
} from "../domain/session/types";
import { buildSessionCard, cycleOrder, getSessionRecoveryProfile } from "../sessionPlanner/sessionTemplates";

const cycleAnchorDate = "2026-03-29";

type BacklogEntry = {
  key: string;
  originalDate: string;
  baseSessionId: string;
  missedReason: MissedSessionReason;
  priority: SessionPriority;
  recoveryCost: number;
};

type RescheduleDecision = {
  baseSessionId: string;
  rescheduledFrom?: string;
  missedReason?: MissedSessionReason;
  warnings: string[];
  selectedReason?: string;
  consumedBacklogKey?: string;
};

const priorityWeight: Record<SessionPriority, number> = {
  A: 3,
  B: 2,
  C: 1
};

const missedReasonWeight: Record<MissedSessionReason, number> = {
  schedule: 16,
  fatigue: 10,
  soreness: 9,
  pain: 5,
  illness: 4
};

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

const addDays = (date: string, amount: number) => {
  const next = parseLocalDate(date);
  next.setDate(next.getDate() + amount);
  return formatLocalDate(next);
};

const differenceInDays = (start: string, end: string) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((parseLocalDate(end).getTime() - parseLocalDate(start).getTime()) / oneDay);
};

const getCycleIndex = (date: string) => {
  const offset = differenceInDays(cycleAnchorDate, date);
  return ((offset % cycleOrder.length) + cycleOrder.length) % cycleOrder.length;
};

const startOfWeek = (date: string) => {
  const target = parseLocalDate(date);
  const day = target.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + offset);
  return formatLocalDate(target);
};

const weekdayLabel = (date: string) => ["일", "월", "화", "수", "목", "금", "토"][parseLocalDate(date).getDay()];

const normalizeMissedReason = (reason?: MissedSessionReason): MissedSessionReason => reason ?? "schedule";

const determineScheduledBaseSessionId = (date: string) => cycleOrder[getCycleIndex(date)];

const recentPullSessions = (input: PlannerInput) =>
  input.sessionLogs.filter((log) => log.baseSessionId === "pull-strength" && log.date <= input.date).slice(-3);

const createReadiness = (input: PlannerInput) => {
  const recovery = input.recoveryState;
  const fatigue = recovery?.fatigue ?? 5;
  const upperDoms = recovery?.upperDoms ?? 4;
  const lowerDoms = recovery?.lowerDoms ?? 4;
  const shoulderStress = recovery?.shoulderStress ?? 4;
  const sleepHours = recovery?.sleepHours ?? 7;
  const missedCount = input.sessionLogs.filter((log) => !log.completed && log.date < input.date).length;

  const score = Math.max(
    25,
    Math.min(
      95,
      88 -
        fatigue * 4 -
        upperDoms * 2 -
        lowerDoms * 2 -
        shoulderStress * 3 +
        (sleepHours - 7) * 4 -
        missedCount * 3
    )
  );

  const affectedBy: string[] = [];
  if (fatigue >= 7) affectedBy.push(`전신 피로 ${fatigue}/10`);
  if (upperDoms >= 7) affectedBy.push(`상체 DOMS ${upperDoms}/10`);
  if (lowerDoms >= 7) affectedBy.push(`하체 DOMS ${lowerDoms}/10`);
  if (shoulderStress >= 7) affectedBy.push(`어깨/팔꿈치 부담 ${shoulderStress}/10`);
  if (sleepHours < 6) affectedBy.push(`수면 ${sleepHours}시간`);
  if (missedCount > 0) affectedBy.push(`미완료 세션 ${missedCount}회`);

  if (score >= 72) {
    return {
      score,
      label: "기본 처방 가능",
      summary: "기본 세션을 수행해도 되는 상태입니다. 그래도 폼이 무너지면 즉시 낮춥니다.",
      affectedBy
    };
  }

  if (score >= 55) {
    return {
      score,
      label: "축소 처방 권장",
      summary: "세션 구조는 유지하되 총량과 밀도를 낮추는 편이 더 낫습니다.",
      affectedBy
    };
  }

  return {
    score,
    label: "회복 처방 권장",
    summary: "오늘은 밀어붙이는 날이 아니라 회복 세션으로 재정비하는 날입니다.",
    affectedBy
  };
};

const determinePullProgressionStep = (input: PlannerInput): PullProgressionStep => {
  const recovery = input.recoveryState;
  const upperDoms = recovery?.upperDoms ?? 4;
  const shoulderStress = recovery?.shoulderStress ?? 4;
  const sleepHours = recovery?.sleepHours ?? 7;
  const recentPull = recentPullSessions(input);
  const failedPull = [...recentPull].reverse().find((log) => !log.completed || log.quality === "failed");

  if (upperDoms >= 8 || shoulderStress >= 8) return "regression";
  if (failedPull) return "quality";
  if (sleepHours < 6 || upperDoms >= 6) return "quality";
  if (recentPull.filter((log) => log.completed && log.quality === "clean").length >= 2) return "density";
  return input.profile.pullTrackLevel === "full" ? "volume" : "quality";
};

const determineVersion = (input: PlannerInput, baseSessionId: string): SessionVersion => {
  const recovery = input.recoveryState;
  const fatigue = recovery?.fatigue ?? 5;
  const upperDoms = recovery?.upperDoms ?? 4;
  const lowerDoms = recovery?.lowerDoms ?? 4;
  const shoulderStress = recovery?.shoulderStress ?? 4;
  const sleepHours = recovery?.sleepHours ?? 7;
  const upperLimited = upperDoms >= 7 || shoulderStress >= 7;
  const lowerLimited = lowerDoms >= 7;
  const severe = fatigue >= 8 || sleepHours < 5;
  const moderate = fatigue >= 6 || sleepHours < 6;
  const missedPull = input.sessionLogs.some(
    (log) =>
      log.baseSessionId === "pull-strength" &&
      !log.completed &&
      normalizeMissedReason(log.missedReason) === "schedule" &&
      log.date < input.date
  );

  if (baseSessionId === "recovery-mobility") return "recovery";
  if (severe) return "recovery";

  if (baseSessionId === "pull-strength") {
    if (upperDoms >= 8 || shoulderStress >= 8) return "recovery";
    if (upperLimited || moderate || missedPull) return "reduced";
    return "normal";
  }

  if (baseSessionId === "push-support") {
    if (upperDoms >= 8 || shoulderStress >= 8) return "recovery";
    if (upperLimited || moderate) return "reduced";
    return "normal";
  }

  if (baseSessionId === "lower-strength") {
    if (lowerDoms >= 8) return "recovery";
    if (lowerLimited || moderate) return "reduced";
    return "normal";
  }

  if (baseSessionId === "firefighter-circuit") {
    if (upperDoms >= 8 || lowerDoms >= 8) return "recovery";
    if (upperLimited || lowerLimited || moderate) return "reduced";
    return "normal";
  }

  return "normal";
};

const capVersionByMissedReason = (
  version: SessionVersion,
  missedReason?: MissedSessionReason
): SessionVersion => {
  if (!missedReason || missedReason === "schedule") {
    return version;
  }

  if (missedReason === "fatigue" || missedReason === "soreness") {
    return version === "normal" ? "reduced" : version;
  }

  return "recovery";
};

const versionReason = (
  version: SessionVersion,
  baseSessionId: string,
  missedReason?: MissedSessionReason
) => {
  if (missedReason === "schedule") {
    if (version === "normal") return "일정 문제로 놓친 세션을 주간 핵심 흐름 안에 다시 배치했습니다.";
    return "일정 문제로 놓친 세션을 무리하지 않는 강도로 다시 배치했습니다.";
  }

  if (missedReason === "fatigue" || missedReason === "soreness") {
    return "피로/근육통 사유의 미수행이라 동일 세션을 full로 밀지 않고 축소 버전으로 전환했습니다.";
  }

  if (missedReason === "pain" || missedReason === "illness") {
    return "통증/컨디션 저하 사유의 미수행이라 같은 세션을 억지로 넣지 않고 회복 처방으로 전환했습니다.";
  }

  if (version === "normal") return "기본 세션을 유지합니다.";
  if (version === "reduced") {
    return baseSessionId === "firefighter-circuit"
      ? "소방 서킷 흐름은 살리되 스테이션 볼륨을 줄였습니다."
      : "폼 붕괴를 막기 위해 축소 세션으로 내렸습니다.";
  }
  return "회복이 더 중요해 회복 세션으로 전환했습니다.";
};

const toBacklogEntry = (log: SessionLog): BacklogEntry => {
  const profile = getSessionRecoveryProfile(log.baseSessionId);

  return {
    key: `${log.date}-${log.baseSessionId}`,
    originalDate: log.date,
    baseSessionId: log.baseSessionId,
    missedReason: normalizeMissedReason(log.missedReason),
    priority: profile.priority,
    recoveryCost: profile.recoveryCost
  };
};

const buildBacklogEntries = (sessionLogs: SessionLog[], beforeDate: string) =>
  sessionLogs
    .filter((log) => !log.completed && log.date < beforeDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(toBacklogEntry);

const backlogScore = (entry: BacklogEntry, targetDate: string) =>
  priorityWeight[entry.priority] * 100 +
  missedReasonWeight[entry.missedReason] +
  Math.min(14, Math.max(0, differenceInDays(entry.originalDate, targetDate))) -
  entry.recoveryCost * 7;

const sortBacklogByPriority = (entries: BacklogEntry[], targetDate: string) =>
  [...entries].sort((a, b) => {
    const scoreDiff = backlogScore(b, targetDate) - backlogScore(a, targetDate);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return a.originalDate.localeCompare(b.originalDate);
  });

const resolveRescheduleDecision = (
  date: string,
  scheduledBaseSessionId: string,
  backlog: BacklogEntry[]
): RescheduleDecision => {
  if (backlog.length === 0) {
    return {
      baseSessionId: scheduledBaseSessionId,
      warnings: [],
      selectedReason: "주간 마이크로사이클에서 오늘 순서에 맞는 세션을 선택했습니다."
    };
  }

  const scheduledProfile = getSessionRecoveryProfile(scheduledBaseSessionId);
  const rankedBacklog = sortBacklogByPriority(backlog, date);
  const backlogCount = backlog.length;

  if (backlogCount >= 2) {
    const priorityABacklog = rankedBacklog.filter((entry) => entry.priority === "A");
    const priorityBBacklog = rankedBacklog.filter((entry) => entry.priority === "B");
    const shortlist =
      priorityABacklog.length > 0
        ? priorityABacklog
        : priorityBBacklog.length > 0
          ? priorityBBacklog
          : rankedBacklog;
    const candidate = shortlist[0];

    if (!candidate || (scheduledProfile.priority === "A" && candidate.priority === "C")) {
      return {
        baseSessionId: scheduledBaseSessionId,
        warnings: ["미수행 세션이 2회 이상 밀려 비핵심 세션은 접고 주간 핵심 세션 위주로 재정렬했습니다."],
        selectedReason: "밀린 세션이 많아 오늘은 핵심 주간 목표를 우선 유지했습니다."
      };
    }

    return {
      baseSessionId: candidate.baseSessionId,
      rescheduledFrom: candidate.originalDate,
      missedReason: candidate.missedReason,
      consumedBacklogKey: candidate.key,
      warnings: ["미수행 세션이 2회 이상 밀려 핵심 세션만 남기고 재정렬했습니다."],
      selectedReason: `${candidate.originalDate}에 놓친 핵심 세션만 남기고 재정렬해 오늘 우선 배치했습니다.`
    };
  }

  const candidate = rankedBacklog[0];
  if (!candidate) {
    return {
      baseSessionId: scheduledBaseSessionId,
      warnings: [],
      selectedReason: "주간 마이크로사이클에서 오늘 순서에 맞는 세션을 선택했습니다."
    };
  }

  if (candidate.missedReason === "schedule") {
    if (candidate.priority !== "A") {
      return {
        baseSessionId: scheduledBaseSessionId,
        warnings: ["일정 문제로 밀린 세션이 있지만 우선순위가 낮아 오늘 핵심 세션을 유지합니다."],
        selectedReason: "일정 문제로 밀린 세션 중 비핵심 세션은 다음 빈도 높은 흐름에 다시 흡수합니다."
      };
    }

    return {
      baseSessionId: candidate.baseSessionId,
      rescheduledFrom: candidate.originalDate,
      missedReason: candidate.missedReason,
      consumedBacklogKey: candidate.key,
      warnings: ["일정 문제로 못한 핵심 세션을 오늘 우선 재배치했습니다."],
      selectedReason: `${candidate.originalDate}에 못한 핵심 세션을 다음 가능한 날로 당겨 배치했습니다.`
    };
  }

  if (candidate.priority === "C" && scheduledProfile.priority === "A") {
    return {
      baseSessionId: scheduledBaseSessionId,
      warnings: ["가벼운 세션 미수행은 남아 있지만 오늘 핵심 세션을 우선 유지합니다."],
      selectedReason: "회복 비용이 낮은 미수행 세션은 오늘 핵심 목표를 해치지 않는 선에서 뒤로 미뤘습니다."
    };
  }

  return {
    baseSessionId: candidate.baseSessionId,
    rescheduledFrom: candidate.originalDate,
    missedReason: candidate.missedReason,
    consumedBacklogKey: candidate.key,
    warnings: [
      candidate.missedReason === "pain" || candidate.missedReason === "illness"
        ? "통증/컨디션 저하 사유의 미수행이라 동일 세션을 회복 쪽으로 낮춰 다시 계산합니다."
        : "피로/근육통 사유의 미수행이라 동일 세션을 축소 강도로 다시 계산합니다."
    ],
    selectedReason: `${candidate.originalDate} 미수행 사유(${candidate.missedReason})를 반영해 오늘 처방 강도를 다시 계산했습니다.`
  };
};

const createDailyPlan = (
  input: PlannerInput,
  overrideDecision?: RescheduleDecision
): PlannerOutput => {
  const readiness = createReadiness(input);
  const scheduledBaseSessionId = determineScheduledBaseSessionId(input.date);
  const decision =
    overrideDecision ??
    resolveRescheduleDecision(input.date, scheduledBaseSessionId, buildBacklogEntries(input.sessionLogs, input.date));
  const progressionStep = determinePullProgressionStep(input);
  const version = capVersionByMissedReason(
    determineVersion(input, decision.baseSessionId),
    decision.missedReason
  );
  const context = {
    pullTrackLevel: input.profile.pullTrackLevel,
    progressionStep,
    readinessNote: readiness.summary
  };

  const availablePlans = {
    normal: buildSessionCard(decision.baseSessionId, "normal", context),
    reduced: buildSessionCard(decision.baseSessionId, "reduced", context),
    recovery: buildSessionCard(decision.baseSessionId, "recovery", context)
  } as const;

  const todayPlan = availablePlans[version];
  const fallbackPlan =
    version === "normal"
      ? availablePlans.reduced
      : version === "reduced"
        ? availablePlans.recovery
        : availablePlans.reduced;

  const warnings = [
    ...readiness.affectedBy,
    ...decision.warnings,
    ...(version !== "normal" || decision.missedReason
      ? [versionReason(version, decision.baseSessionId, decision.missedReason)]
      : [])
  ];

  return {
    date: input.date,
    phase:
      decision.baseSessionId === "firefighter-circuit"
        ? "2027 소방 체력 우선 블록"
        : decision.baseSessionId === "pull-strength"
          ? "풀업 성장 우선 블록"
          : "회복/균형 유지 블록",
    baseSessionId: decision.baseSessionId,
    cardPriority:
      decision.baseSessionId === "firefighter-circuit"
        ? "firefighter"
        : decision.baseSessionId === "pull-strength"
          ? "pull-up"
          : "recovery",
    readiness,
    todayPlan,
    fallbackPlan,
    availablePlans,
    warnings,
    selectedReason: [
      decision.selectedReason ?? "주간 마이크로사이클에서 오늘 순서에 맞는 세션을 선택했습니다.",
      versionReason(version, decision.baseSessionId, decision.missedReason),
      decision.baseSessionId === "pull-strength"
        ? `풀업 트랙은 ${input.profile.pullTrackLevel}, 오늘 단계는 ${progressionStep} 우선입니다.`
        : "소방 체력, 감량, 회복을 해치지 않는 범위로 세션을 배치했습니다."
    ],
    nextFlow: [1, 2, 3].map((offset) => {
      const nextDate = addDays(input.date, offset);
      const nextBase = determineScheduledBaseSessionId(nextDate);
      return {
        label: `${offset}일 후`,
        title:
          nextBase === "firefighter-circuit"
            ? "소방 서킷 Day"
            : nextBase === "pull-strength"
              ? "풀업 성장 Day"
              : nextBase === "lower-strength"
                ? "하체 힘 Day"
                : nextBase === "push-support"
                  ? "푸시 + 상체 보강 Day"
                  : "회복 + 가동성 Day",
        focus:
          nextBase === "firefighter-circuit"
            ? "실전 스테이션 순환"
            : nextBase === "pull-strength"
              ? "풀업 메인 볼륨"
              : nextBase === "lower-strength"
                ? "하체 힘과 운반"
                : nextBase === "push-support"
                  ? "상체 균형과 장비 홀드"
                  : "회복과 mobility"
      };
    })
  };
};

const projectRecovery = (
  recovery: RecoveryState | undefined,
  daysAhead: number
): RecoveryState | undefined => {
  if (!recovery) return recovery;
  if (daysAhead <= 0) return recovery;

  return {
    ...recovery,
    fatigue: Math.max(4, recovery.fatigue - daysAhead),
    upperDoms: Math.max(3, recovery.upperDoms - daysAhead),
    lowerDoms: Math.max(3, recovery.lowerDoms - daysAhead),
    shoulderStress: Math.max(3, recovery.shoulderStress - Math.min(daysAhead, 2)),
    sleepHours: Math.max(6.5, recovery.sleepHours)
  };
};

const buildForwardRescheduleMap = (
  input: PlannerInput,
  startDate: string,
  endDate: string
) => {
  const assignments = new Map<string, RescheduleDecision>();
  let backlog = buildBacklogEntries(input.sessionLogs, startDate);

  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, 1)) {
    const scheduledBaseSessionId = determineScheduledBaseSessionId(cursor);
    const decision = resolveRescheduleDecision(cursor, scheduledBaseSessionId, backlog);
    assignments.set(cursor, decision);

    if (decision.consumedBacklogKey) {
      backlog = backlog.filter((entry) => entry.key !== decision.consumedBacklogKey);
    }
  }

  return assignments;
};

export const createPlannerOutput = (input: PlannerInput): PlannerOutput => createDailyPlan(input);

export const createWeeklyPlannerOutput = (
  input: PlannerInput,
  todayDate: string,
  recoveryResolver: (date: string) => RecoveryState | undefined
): WeeklyPlannerOutput => {
  const weekStart = startOfWeek(todayDate);
  const weekEnd = addDays(weekStart, 6);
  const forwardAssignments = buildForwardRescheduleMap(input, todayDate, weekEnd);

  const items: WeeklyPlanItem[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const daysAhead = Math.max(0, differenceInDays(todayDate, date));
    const recoveryState = projectRecovery(recoveryResolver(date) ?? recoveryResolver(todayDate), daysAhead);
    const decision = date >= todayDate ? forwardAssignments.get(date) : undefined;
    const output = createDailyPlan(
      {
        ...input,
        date,
        recoveryState,
        sessionLogs: input.sessionLogs.filter((log) => log.date <= date)
      },
      decision
    );
    const sessionLog = input.sessionLogs.find((log) => log.date === date);
    const status =
      date === todayDate
        ? sessionLog?.completed
          ? "completed"
          : "today"
        : date < todayDate
          ? sessionLog?.completed
            ? "completed"
            : "missed"
          : "scheduled";

    return {
      date,
      dayLabel: `${weekdayLabel(date)} · ${date}`,
      sessionTitle: output.todayPlan.title,
      sessionType: output.todayPlan.version,
      summary: output.todayPlan.summary,
      estimatedMinutes: output.todayPlan.estimatedMinutes,
      densityLabel: output.todayPlan.densityLabel,
      focusTags: output.todayPlan.focusTags.slice(0, 4),
      keyExercises: output.todayPlan.exercises.slice(0, 5).map((exercise) => exercise.name),
      warnings: output.warnings.slice(0, 2),
      status,
      isToday: date === todayDate,
      rescheduledFrom: decision?.rescheduledFrom,
      missedReason: decision?.missedReason
    };
  });

  return {
    weekLabel: `${weekStart} ~ ${weekEnd}`,
    startDate: weekStart,
    endDate: weekEnd,
    items
  };
};
