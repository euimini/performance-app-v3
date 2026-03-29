import type { SessionLog } from "../records/SessionLog";
import type { RecoveryState } from "../recovery/RecoveryState";

export type ExercisePrescription = {
  id: string;
  운동명: string;
  세트: number;
  반복?: string;
  시간초?: number;
  휴식초: number;
  목표자각도: string;
  타이머초: number;
  대체동작: string;
  코칭문구: string;
};

export type SessionBlock = {
  id: string;
  블록명: string;
  목적: string;
  운동목록: ExercisePrescription[];
};

export type SessionPlan = {
  id: string;
  세션명: string;
  목적: string;
  한줄설명: string;
  강도라벨: "정상";
  블록들: SessionBlock[];
};

export type ReducedSessionPlan = {
  id: string;
  세션명: string;
  목적: string;
  한줄설명: string;
  강도라벨: "가볍게";
  전환이유: string;
  블록들: SessionBlock[];
};

export type RecoverySessionPlan = {
  id: string;
  세션명: string;
  목적: string;
  한줄설명: string;
  강도라벨: "회복";
  전환이유: string;
  블록들: SessionBlock[];
};

export type SessionDraft = {
  date: string;
  selectedPlanId: string;
  selectedIntensity: "정상" | "가볍게" | "회복";
  startedAt?: string;
};

export type MissedSessionAction =
  | "그대로 재배정"
  | "볼륨 감산 후 재배정"
  | "회복 세션으로 전환";

export type OnboardingProfile = {
  주요목표: string[];
  장비: string[];
  제약: string[];
};

export type PlannerInput = {
  date: string;
  profile: OnboardingProfile;
  recoveryState?: RecoveryState;
  sessionLogs: SessionLog[];
  sessionDraft?: SessionDraft;
};

export type PlannerOutput = {
  date: string;
  hero: {
    세션명: string;
    목적: string;
    요약문구: string;
    운동목록: string[];
    시작버튼문구: string;
  };
  today: SessionPlan;
  reduced: ReducedSessionPlan;
  recovery: RecoverySessionPlan;
  defaultIntensity: "정상" | "가볍게" | "회복";
  missedSessionAction: MissedSessionAction;
};

export type TodaySessionSelection = {
  intensity: "정상" | "가볍게" | "회복";
  selectedPlan: SessionPlan | ReducedSessionPlan | RecoverySessionPlan;
  hero: PlannerOutput["hero"];
};
