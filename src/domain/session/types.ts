import type { MissedSessionReason, SessionLog } from "../records/SessionLog";
import type { RecoveryState } from "../recovery/RecoveryState";

export type SessionVersion = "normal" | "reduced" | "recovery";

export type SessionCategory = "pull" | "push" | "lower" | "firefighter" | "recovery" | "rest";

export type GoalTag =
  | "2027-firefighter"
  | "pull-up-growth"
  | "fat-loss"
  | "mobility"
  | "recovery";

export type CardPriority = "firefighter" | "pull-up" | "recovery";

export type FirefighterStationName =
  | "stair"
  | "hose"
  | "carry"
  | "rescue"
  | "hold"
  | "shuttle";

export type PullTrackLevel = "full" | "assisted" | "plateau";

export type PullProgressionStep = "quality" | "volume" | "density" | "load" | "regression";
export type SessionPriority = "A" | "B" | "C";

export type ExercisePrescription = {
  id: string;
  name: string;
  prescription: string;
  rest: string;
  targetRpe: string;
  substitute: string;
  coachingCue: string;
  timerSeconds?: number;
  stationName?: FirefighterStationName;
  stationLabel?: string;
};

export type SessionBlock = {
  id: string;
  title: string;
  purpose: string;
  estimatedMinutes: number;
  exercises: ExercisePrescription[];
};

export type FirefighterStationMapping = {
  stationName: FirefighterStationName;
  testLabel: string;
  movementLabel: string;
  prescription: string;
  rest: string;
  note: string;
};

export type PullUpProgressionMeta = {
  trackLabel: string;
  currentTier: string;
  primaryMovement: string;
  qualityGate: string;
  progressionStep: PullProgressionStep;
  progressionRule: string;
  fallbackMovements: string[];
  readinessAdjustment: string;
};

export type SessionCard = {
  id: string;
  baseSessionId: string;
  title: string;
  category: SessionCategory;
  version: SessionVersion;
  priority: SessionPriority;
  recoveryCost: number;
  focusTags: string[];
  goalTags: GoalTag[];
  summary: string;
  description: string;
  estimatedMinutes: number;
  densityLabel: string;
  exercises: ExercisePrescription[];
  blocks: SessionBlock[];
  firefighterStations?: FirefighterStationMapping[];
  pullUpMeta?: PullUpProgressionMeta;
  blockedBy: string[];
  recommendedWhen: string[];
  fallbackSessionId: string;
  notes: string[];
  progressionRules: string[];
  recoveryTriggers: string[];
};

export type SessionDraft = {
  date: string;
  selectedSessionId: string;
  selectedVersion: SessionVersion;
  startedAt?: string;
};

export type OnboardingProfile = {
  primaryGoals: string[];
  equipment: string[];
  constraints: string[];
  pullTrackLevel: PullTrackLevel;
};

export type PlannerInput = {
  date: string;
  profile: OnboardingProfile;
  recoveryState?: RecoveryState;
  sessionLogs: SessionLog[];
  sessionDraft?: SessionDraft;
};

export type ReadinessInterpretation = {
  score: number;
  label: string;
  summary: string;
  affectedBy: string[];
};

export type NextStepPreview = {
  label: string;
  title: string;
  focus: string;
};

export type PlannerOutput = {
  date: string;
  phase: string;
  baseSessionId: string;
  cardPriority: CardPriority;
  readiness: ReadinessInterpretation;
  todayPlan: SessionCard;
  fallbackPlan: SessionCard;
  availablePlans: Record<SessionVersion, SessionCard>;
  warnings: string[];
  selectedReason: string[];
  nextFlow: NextStepPreview[];
};

export type TodaySessionSelection = {
  version: SessionVersion;
  selectedPlan: SessionCard;
  fallbackPlan: SessionCard;
  readiness: ReadinessInterpretation;
  warnings: string[];
};

export type WeeklyPlanStatus = "completed" | "missed" | "today" | "scheduled";

export type WeeklyPlanItem = {
  date: string;
  dayLabel: string;
  sessionTitle: string;
  sessionType: SessionVersion | "rest";
  summary: string;
  estimatedMinutes: number;
  densityLabel: string;
  focusTags: string[];
  keyExercises: string[];
  warnings: string[];
  status: WeeklyPlanStatus;
  isToday: boolean;
  rescheduledFrom?: string;
  missedReason?: MissedSessionReason;
};

export type WeeklyPlannerOutput = {
  weekLabel: string;
  startDate: string;
  endDate: string;
  items: WeeklyPlanItem[];
};
