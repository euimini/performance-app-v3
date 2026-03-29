import { useEffect, useMemo, useState } from "react";
import type { TodaySessionSelection } from "../../domain/session/types";
import { TimerChip } from "../timers/TimerChip";

type SessionPlanViewProps = {
  selection: TodaySessionSelection;
  onIntensityChange: (intensity: "정상" | "가볍게" | "회복") => void;
};

type ActiveTimer = {
  exerciseId: string;
  exerciseName: string;
  remainingSeconds: number;
};

const labels: Array<"정상" | "가볍게" | "회복"> = ["정상", "가볍게", "회복"];

export const SessionPlanView = ({ selection, onIntensityChange }: SessionPlanViewProps) => {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const currentPlan = selection.selectedPlan;

  const exercises = useMemo(
    () =>
      currentPlan.블록들.flatMap((block, blockIndex) =>
        block.운동목록.map((exercise, exerciseIndex) => ({
          ...exercise,
          blockName: block.블록명,
          order: `${blockIndex + 1}-${exerciseIndex + 1}`
        }))
      ),
    [currentPlan]
  );

  const nextExercise = exercises.find((exercise) => !completedIds.includes(exercise.id)) ?? exercises[0];

  useEffect(() => {
    if (!activeTimer) {
      return;
    }

    if (activeTimer.remainingSeconds <= 0) {
      setActiveTimer(null);
      return;
    }

    const timerId = window.setTimeout(() => {
      setActiveTimer((current) =>
        current
          ? { ...current, remainingSeconds: current.remainingSeconds - 1 }
          : null
      );
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [activeTimer]);

  const completeExercise = (exerciseId: string) => {
    setCompletedIds((prev) => (prev.includes(exerciseId) ? prev : [...prev, exerciseId]));
  };

  const startTimer = (exerciseId: string, exerciseName: string, seconds: number) => {
    setActiveTimer({
      exerciseId,
      exerciseName,
      remainingSeconds: seconds
    });
  };

  return (
    <section className="session-card" id="today-session">
      <div className="session-header">
        <div>
          <div className="eyebrow">오늘 루틴</div>
          <h2>{currentPlan.세션명}</h2>
          <p>{currentPlan.목적}</p>
          <p>{currentPlan.한줄설명}</p>
        </div>
        <div className="mode-switch-wrap">
          <div className="mode-switch" role="tablist" aria-label="세션 강도 선택">
            {labels.map((label) => (
              <button
                key={label}
                className={selection.intensity === label ? "mode-button active" : "mode-button"}
                onClick={() => onIntensityChange(label)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mode-help">몸이 무겁다면 가볍게 또는 회복으로 바로 바꿉니다.</p>
        </div>
      </div>

      <div className="session-flow-card">
        <div>
          <div className="eyebrow">지금 할 운동</div>
          <h3>{nextExercise.운동명}</h3>
          <p className="flow-main-text">
            {nextExercise.반복
              ? `${nextExercise.세트}세트 x ${nextExercise.반복}`
              : `${nextExercise.세트}세트 x ${nextExercise.시간초}초`}
          </p>
        </div>
        <div className="flow-badges">
          <span className="flow-badge">휴식 {nextExercise.휴식초}초</span>
          <span className="flow-badge">RPE {nextExercise.목표자각도}</span>
          <span className="flow-badge">{nextExercise.blockName}</span>
        </div>
      </div>

      <div className="steps">
        {exercises.map((exercise) => {
          const done = completedIds.includes(exercise.id);
          const isRunning = activeTimer?.exerciseId === exercise.id;

          return (
            <article className={done ? "step-card step-card-done" : "step-card"} key={exercise.id}>
              <div className="step-order">순서 {exercise.order}</div>
              <div className="step-top">
                <div>
                  <h4>{exercise.운동명}</h4>
                  <p className="step-block-name">{exercise.blockName}</p>
                </div>
                <TimerChip seconds={exercise.타이머초} />
              </div>

              <p className="prescription">
                {exercise.반복
                  ? `${exercise.세트}세트 x ${exercise.반복}`
                  : `${exercise.세트}세트 x ${exercise.시간초}초`}
              </p>

              <div className="step-data">
                <span>휴식 {exercise.휴식초}초</span>
                <span>RPE {exercise.목표자각도}</span>
              </div>

              <p>대체 동작 {exercise.대체동작}</p>
              <p className="cue">{exercise.코칭문구}</p>

              <div className="step-actions">
                <button
                  className="secondary-button"
                  onClick={() => startTimer(exercise.id, exercise.운동명, exercise.타이머초)}
                  type="button"
                >
                  {isRunning ? "타이머 다시 시작" : "타이머 시작"}
                </button>
                <button
                  className={done ? "secondary-button" : "primary-button"}
                  onClick={() => completeExercise(exercise.id)}
                  type="button"
                >
                  {done ? "완료됨" : "이 운동 끝내기"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {"전환이유" in currentPlan ? <p className="session-note">{currentPlan.전환이유}</p> : null}

      {activeTimer ? (
        <div className="timer-panel">
          <strong>{activeTimer.exerciseName} 타이머</strong>
          <span>{activeTimer.remainingSeconds}초 남음</span>
        </div>
      ) : null}
    </section>
  );
};
