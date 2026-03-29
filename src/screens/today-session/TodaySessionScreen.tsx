import type { PlannerOutput, SessionDraft } from "../../domain/session/types";
import { SessionPlanView } from "../../components/session/SessionPlanView";
import { selectTodaySession } from "../../selectors/selectTodaySession";

type TodaySessionScreenProps = {
  plannerOutput: PlannerOutput;
  draft?: SessionDraft;
  onIntensityChange: (intensity: "정상" | "가볍게" | "회복") => void;
};

export const TodaySessionScreen = ({
  plannerOutput,
  draft,
  onIntensityChange
}: TodaySessionScreenProps) => (
  <SessionPlanView
    selection={selectTodaySession(plannerOutput, draft)}
    onIntensityChange={onIntensityChange}
  />
);
