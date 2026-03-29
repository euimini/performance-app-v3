import type { PlannerOutput, SessionDraft, TodaySessionSelection } from "../domain/session/types";

export const selectTodaySession = (
  output: PlannerOutput,
  draft?: SessionDraft
): TodaySessionSelection => {
  const intensity = draft?.selectedIntensity ?? output.defaultIntensity;
  const selectedPlan =
    intensity === "회복" ? output.recovery : intensity === "가볍게" ? output.reduced : output.today;

  return {
    intensity,
    selectedPlan,
    hero: {
      세션명: selectedPlan.세션명,
      목적: selectedPlan.목적,
      요약문구: selectedPlan.한줄설명,
      운동목록: selectedPlan.블록들.flatMap((block) =>
        block.운동목록.map((exercise) => exercise.운동명)
      ),
      시작버튼문구: "오늘 루틴 시작"
    }
  };
};
