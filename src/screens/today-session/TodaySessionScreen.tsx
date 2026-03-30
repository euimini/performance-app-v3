import type { MissedSessionReason } from "../../domain/records/SessionLog";
import type { PlannerOutput, SessionDraft, SessionVersion } from "../../domain/session/types";
import { SessionPlanView } from "../../components/session/SessionPlanView";
import { selectTodaySession } from "../../selectors/selectTodaySession";

type TodaySessionScreenProps = {
  plannerOutput: PlannerOutput;
  draft?: SessionDraft;
  onVersionChange: (version: SessionVersion) => void;
  onReset: () => void;
  resetKey: number;
  onComplete: () => void;
  onMarkMissed: (reason: MissedSessionReason) => void;
};

export const TodaySessionScreen = ({
  plannerOutput,
  draft,
  onVersionChange,
  onReset,
  resetKey,
  onComplete,
  onMarkMissed
}: TodaySessionScreenProps) => (
  <SessionPlanView
    activeDate={plannerOutput.date}
    key={resetKey}
    selection={selectTodaySession(plannerOutput, draft)}
    onVersionChange={onVersionChange}
    onComplete={onComplete}
    onMarkMissed={onMarkMissed}
    onReset={onReset}
  />
);
