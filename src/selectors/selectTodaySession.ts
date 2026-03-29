import type { PlannerOutput, SessionDraft, TodaySessionSelection } from "../domain/session/types";

export const selectTodaySession = (
  output: PlannerOutput,
  draft?: SessionDraft
): TodaySessionSelection => {
  const version = draft?.selectedVersion ?? output.todayPlan.version;
  const selectedPlan = output.availablePlans[version];
  const fallbackPlan =
    version === "normal"
      ? output.availablePlans.reduced
      : version === "reduced"
        ? output.availablePlans.recovery
        : output.availablePlans.reduced;

  return {
    version,
    selectedPlan,
    fallbackPlan,
    readiness: output.readiness,
    warnings: output.warnings
  };
};
