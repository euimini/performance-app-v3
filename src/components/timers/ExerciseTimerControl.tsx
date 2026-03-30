import { useMemo } from "react";
import type { ExercisePrescription } from "../../domain/session/types";
import { buildExerciseTimerSetup, useExerciseTimer } from "./useExerciseTimer";

type ExerciseTimerControlProps = {
  exercise: ExercisePrescription;
  isDone: boolean;
  onFinishExercise: () => void;
};

const formatClock = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remain = Math.max(0, seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remain}`;
};

export const ExerciseTimerControl = ({
  exercise,
  isDone,
  onFinishExercise
}: ExerciseTimerControlProps) => {
  const setup = useMemo(
    () => buildExerciseTimerSetup(exercise.prescription, exercise.timerSeconds, exercise.rest),
    [exercise.prescription, exercise.rest, exercise.timerSeconds]
  );

  const { state, actions } = useExerciseTimer({
    setup,
    isDone,
    onFinishAllRounds: onFinishExercise
  });

  if (state.status === "idle") {
    return (
      <div className="timer-slot">
        <button className="secondary-button timer-launch-button" onClick={actions.start} type="button">
          타이머 시작
        </button>
        <span className="timer-progress-hint">진행 표시: 1/{setup.totalRounds}</span>
      </div>
    );
  }

  const phaseLabel =
    state.status === "finished"
      ? "모든 진행 완료"
      : state.phase === "rest"
        ? "휴식 중"
        : "동작 진행 중";

  return (
    <div className={state.status === "finished" ? "timer-slot timer-slot-finished" : "timer-slot"}>
      <div className="timer-inline-card">
        <div className="timer-inline-top">
          <strong>{phaseLabel}</strong>
          <span className="timer-round-chip">
            {state.currentRound}/{setup.totalRounds}
          </span>
        </div>

        <div className="timer-inline-time">{formatClock(state.remainingSeconds)}</div>

        <div className="timer-inline-meta">
          <span>{setup.roundLabel === "진행" ? "현재 진행" : `현재 ${setup.roundLabel}`}</span>
          <span>
            {state.currentRound}/{setup.totalRounds}
          </span>
          {state.phase === "rest" && setup.restSeconds > 0 ? <span>다음 세트 준비</span> : null}
        </div>

        {setup.usedFallbackWorkSeconds ? (
          <p className="timer-inline-note">반복 운동이라 세트당 30초 기준 타이머로 표시합니다.</p>
        ) : null}

        <div className="timer-inline-controls">
          {state.status === "running" ? (
            <button className="secondary-button" onClick={actions.pause} type="button">
              일시정지
            </button>
          ) : state.status === "paused" ? (
            <button className="secondary-button" onClick={actions.resume} type="button">
              계속
            </button>
          ) : null}

          {state.status !== "finished" ? (
            <button className="secondary-button" onClick={actions.restartCurrent} type="button">
              다시 시작
            </button>
          ) : (
            <button className="secondary-button" onClick={actions.reset} type="button">
              처음부터
            </button>
          )}

          {state.status !== "finished" ? (
            <button className="primary-button" onClick={actions.moveToNext} type="button">
              {state.phase === "rest" ? "다음 세트 시작" : "다음 세트로"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
