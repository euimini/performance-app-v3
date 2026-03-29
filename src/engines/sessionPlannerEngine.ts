import type {
  MissedSessionAction,
  PlannerInput,
  PlannerOutput,
  RecoverySessionPlan,
  ReducedSessionPlan,
  SessionBlock,
  SessionPlan
} from "../domain/session/types";
import { sessionTemplates, type SessionTemplate } from "../sessionPlanner/sessionTemplates";

const order = ["pull-growth", "fire-duty", "lean-mobility"] as const;

const isoDay = (date: string) => {
  const day = new Date(date).getDay();
  return day === 0 ? 7 : day;
};

const chooseTemplate = (input: PlannerInput): SessionTemplate => {
  const lastMiss = [...input.sessionLogs].reverse().find((log) => !log.completed);
  if (lastMiss) {
    const retryTemplate = sessionTemplates.find(
      (template) => template.id === lastMiss.sessionTemplateId
    );
    if (retryTemplate) {
      return retryTemplate;
    }
  }

  const index = (isoDay(input.date) - 1) % order.length;
  return sessionTemplates.find((template) => template.id === order[index]) ?? sessionTemplates[0];
};

const mapBlocks = (blocks: SessionBlock[], mapper: (block: SessionBlock) => SessionBlock) =>
  blocks.map(mapper);

const reduceBlocks = (blocks: SessionBlock[]): SessionBlock[] =>
  mapBlocks(blocks, (block) => ({
    ...block,
    운동목록: block.운동목록.map((exercise) => ({
      ...exercise,
      세트: Math.max(2, exercise.세트 - 1),
      반복: exercise.반복
        ? exercise.반복.replace(/\d+/g, (value) => String(Math.max(3, Number(value) - 2)))
        : exercise.반복,
      시간초: exercise.시간초 ? Math.max(20, exercise.시간초 - 15) : exercise.시간초,
      휴식초: exercise.휴식초 + 15,
      타이머초: exercise.시간초 ? Math.max(20, exercise.타이머초 - 15) : exercise.타이머초,
      목표자각도:
        exercise.목표자각도 === "8"
          ? "6-7"
          : exercise.목표자각도 === "7"
            ? "6"
            : "5-6"
    }))
  }));

const recoveryBlocks = (blocks: SessionBlock[]): SessionBlock[] =>
  mapBlocks(blocks, (block) => ({
    ...block,
    운동목록: block.운동목록.map((exercise) => ({
      ...exercise,
      세트: 2,
      반복: exercise.반복
        ? exercise.반복.replace(/\d+/g, (value) => String(Math.max(3, Math.floor(Number(value) / 2))))
        : undefined,
      시간초: exercise.시간초 ? Math.max(20, Math.floor(exercise.시간초 * 0.6)) : 20,
      휴식초: Math.max(30, exercise.휴식초),
      타이머초: exercise.시간초 ? Math.max(20, Math.floor(exercise.타이머초 * 0.6)) : 20,
      목표자각도: "5-6"
    }))
  }));

const buildTodayPlan = (template: SessionTemplate): SessionPlan => ({
  id: `${template.id}-normal`,
  세션명: template.세션명,
  목적: template.목적,
  한줄설명: template.한줄설명,
  강도라벨: "정상",
  블록들: template.블록들
});

const buildReducedPlan = (template: SessionTemplate): ReducedSessionPlan => ({
  id: `${template.id}-reduced`,
  세션명: `${template.세션명} · 가볍게`,
  목적: template.목적,
  한줄설명: "볼륨을 줄여도 오늘 흐름은 끊지 않도록 다시 묶었습니다.",
  강도라벨: "가볍게",
  전환이유: "피로나 DOMS가 있으면 세트와 시간을 낮춘 처방으로 바로 전환합니다.",
  블록들: reduceBlocks(template.블록들)
});

const buildRecoveryPlan = (template: SessionTemplate): RecoverySessionPlan => ({
  id: `${template.id}-recovery`,
  세션명: `${template.세션명} · 회복`,
  목적: "회복을 우선하면서 움직임 감각을 유지합니다.",
  한줄설명: "설명보다 먼저 회복 처방부터 바로 수행합니다.",
  강도라벨: "회복",
  전환이유: "피로가 높거나 근육통이 크면 회복 세션이 오늘 우선 처방입니다.",
  블록들: recoveryBlocks(template.블록들)
});

const decideMissedAction = (input: PlannerInput): MissedSessionAction => {
  const missedCount = input.sessionLogs.filter((log) => !log.completed).length;
  const fatigue = input.recoveryState?.피로도 ?? 0;
  const doms = input.recoveryState?.근육통 ?? 0;

  if (fatigue >= 8 || doms >= 8) {
    return "회복 세션으로 전환";
  }

  if (missedCount >= 2 || fatigue >= 6 || doms >= 6) {
    return "볼륨 감산 후 재배정";
  }

  return "그대로 재배정";
};

export const createPlannerOutput = (input: PlannerInput): PlannerOutput => {
  const template = chooseTemplate(input);
  const missedSessionAction = decideMissedAction(input);
  const today = buildTodayPlan(template);
  const reduced = buildReducedPlan(template);
  const recovery = buildRecoveryPlan(template);

  const defaultIntensity =
    missedSessionAction === "회복 세션으로 전환"
      ? "회복"
      : missedSessionAction === "볼륨 감산 후 재배정"
        ? "가볍게"
        : "정상";

  const heroPlan =
    defaultIntensity === "정상" ? today : defaultIntensity === "가볍게" ? reduced : recovery;

  return {
    date: input.date,
    hero: {
      세션명: heroPlan.세션명,
      목적: heroPlan.목적,
      요약문구: heroPlan.한줄설명,
      운동목록: heroPlan.블록들.flatMap((block) =>
        block.운동목록.map((exercise) => exercise.운동명)
      ),
      시작버튼문구: "오늘 루틴 시작"
    },
    today,
    reduced,
    recovery,
    defaultIntensity,
    missedSessionAction
  };
};
