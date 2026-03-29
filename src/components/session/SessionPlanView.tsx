import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { MissedSessionReason } from "../../domain/records/SessionLog";
import type { SessionVersion, TodaySessionSelection } from "../../domain/session/types";
import { TimerChip } from "../timers/TimerChip";

type SessionPlanViewProps = {
  selection: TodaySessionSelection;
  onVersionChange: (version: SessionVersion) => void;
  onReset: () => void;
  onComplete: () => void;
  onMarkMissed: (reason: MissedSessionReason) => void;
};

type ActiveTimer = {
  exerciseId: string;
  exerciseName: string;
  remainingSeconds: number;
};

const versionOptions: Array<{ id: SessionVersion; label: string }> = [
  { id: "normal", label: "기본 처방" },
  { id: "reduced", label: "축소" },
  { id: "recovery", label: "회복" }
];

const missedReasonOptions: Array<{ id: MissedSessionReason; label: string }> = [
  { id: "schedule", label: "일정" },
  { id: "fatigue", label: "피로" },
  { id: "soreness", label: "근육통" },
  { id: "pain", label: "통증" },
  { id: "illness", label: "컨디션" }
];

export const SessionPlanView = ({
  selection,
  onVersionChange,
  onReset,
  onComplete,
  onMarkMissed
}: SessionPlanViewProps) => {
  const isDebugEnabled = import.meta.env.DEV;
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [completionMessage, setCompletionMessage] = useState("");
  const [completionNotified, setCompletionNotified] = useState(false);
  const [missedMessage, setMissedMessage] = useState("");
  const [isMissedDialogOpen, setIsMissedDialogOpen] = useState(false);
  const [missedDialogDebug, setMissedDialogDebug] = useState("idle");
  const currentPlan = selection.selectedPlan;

  const exercises = useMemo(
    () =>
      currentPlan.blocks.flatMap((block, blockIndex) =>
        block.exercises.map((exercise, exerciseIndex) => ({
          ...exercise,
          blockTitle: block.title,
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
        current ? { ...current, remainingSeconds: current.remainingSeconds - 1 } : null
      );
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [activeTimer]);

  useEffect(() => {
    if (exercises.length === 0 || completedIds.length !== exercises.length || completionNotified) {
      return;
    }

    onComplete();
    setCompletionMessage("오늘 처방이 완료되어 기록에 자동 반영되었습니다.");
    setCompletionNotified(true);
  }, [completedIds.length, completionNotified, exercises.length, onComplete]);

  useEffect(() => {
    document.body.style.overflow = isMissedDialogOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMissedDialogOpen]);

  const completeExercise = (exerciseId: string) => {
    setCompletedIds((prev) => (prev.includes(exerciseId) ? prev : [...prev, exerciseId]));
  };

  const startTimer = (exerciseId: string, exerciseName: string, seconds?: number) => {
    if (!seconds) {
      return;
    }

    setActiveTimer({
      exerciseId,
      exerciseName,
      remainingSeconds: seconds
    });
  };

  const openMissedDialog = () => {
    setMissedDialogDebug("triggered");
    setIsMissedDialogOpen(true);
  };

  const closeMissedDialog = () => {
    setIsMissedDialogOpen(false);
    setMissedDialogDebug("closed");
  };

  const markMissed = (reason: MissedSessionReason) => {
    setMissedDialogDebug(`reason:${reason}`);
    onMarkMissed(reason);
    const label = missedReasonOptions.find((option) => option.id === reason)?.label ?? reason;
    setMissedMessage(`오늘 미수행 사유를 ${label}(으)로 저장했습니다. 다음 처방 계산에 반영됩니다.`);
    setIsMissedDialogOpen(false);
  };

  const missedDialog =
    isMissedDialogOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="missed-dialog-backdrop"
            onClick={closeMissedDialog}
            role="presentation"
          >
            <section
              aria-label="미수행 사유 팝업"
              aria-describedby="missed-dialog-description"
              aria-modal="true"
              className="missed-dialog"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="eyebrow">미수행 사유 선택</div>
              <h3>오늘 세션을 못한 이유를 남겨주세요.</h3>
              <p id="missed-dialog-description">
                이유에 따라 다음 처방이 `재배치`, `축소`, `회복`으로 다시 계산됩니다.
              </p>

              <div className="missed-dialog-grid">
                {missedReasonOptions.map((option) => (
                  <button
                    key={option.id}
                    className="secondary-button missed-dialog-button"
                    onClick={() => markMissed(option.id)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {isDebugEnabled ? (
                <div className="missed-debug-box">
                  <strong>debug</strong>
                  <span>click detected: {missedDialogDebug}</span>
                  <span>open state: {String(isMissedDialogOpen)}</span>
                  <span>dialog rendered: true</span>
                </div>
              ) : null}

              <button className="primary-button primary-button-wide" onClick={closeMissedDialog} type="button">
                닫기
              </button>
            </section>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <section className="session-card" id="today-session">
        <div className="session-header">
          <div>
            <div className="eyebrow">오늘 세션</div>
            <h2>{currentPlan.title}</h2>
            <p>{currentPlan.summary}</p>
            <p>{currentPlan.description}</p>
            <div className="flow-badges">
              <span className="flow-badge">{currentPlan.estimatedMinutes}분</span>
              <span className="flow-badge">{currentPlan.densityLabel}</span>
            </div>
          </div>

          <div className="mode-switch-wrap">
            <div className="mode-switch" role="tablist" aria-label="세션 버전 선택">
              {versionOptions.map((option) => (
                <button
                  key={option.id}
                  className={selection.version === option.id ? "mode-button active" : "mode-button"}
                  onClick={() => onVersionChange(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button className="secondary-button reset-button" onClick={onReset} type="button">
              오늘 루틴 초기화
            </button>
            <button className="danger-button reset-button" onClick={openMissedDialog} type="button">
              오늘 미수행 기록
            </button>
            <p className="mode-help">
              폼이 무너지거나 통증이 올라오면 즉시 축소 또는 회복 버전으로 바꿉니다.
            </p>
            {isDebugEnabled ? (
              <p className="mode-help">
                missed-dialog debug: {missedDialogDebug} / open={String(isMissedDialogOpen)}
              </p>
            ) : null}
            {missedMessage ? <p className="recovery-status">{missedMessage}</p> : null}
          </div>
        </div>

        <div className="session-flow-card">
          <div>
            <div className="eyebrow">지금 바로 할 동작</div>
            <h3>{nextExercise?.name ?? "회복 걷기"}</h3>
            <p className="flow-main-text">{nextExercise?.prescription ?? "12분, 심박수 105~124bpm"}</p>
          </div>
          <div className="flow-badges">
            <span className="flow-badge">{selection.readiness.label}</span>
            <span className="flow-badge">{nextExercise?.rest ?? "지속"}</span>
            <span className="flow-badge">{nextExercise?.targetRpe ?? "RPE 5"}</span>
          </div>
        </div>

        {selection.warnings.length > 0 ? (
          <div className="warning-stack">
            {selection.warnings.map((warning) => (
              <div className="warning-pill" key={warning}>
                {warning}
              </div>
            ))}
          </div>
        ) : null}

        {currentPlan.firefighterStations ? (
          <section className="station-panel">
            <div className="eyebrow">시험 종목 대응</div>
            <div className="station-grid">
              {currentPlan.firefighterStations.map((station) => (
                <article className="station-card" key={station.stationName}>
                  <div className="mini-label">{station.testLabel}</div>
                  <strong>{station.movementLabel}</strong>
                  <p>{station.prescription}</p>
                  <span>{station.rest}</span>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {currentPlan.pullUpMeta ? (
          <section className="pull-track-panel">
            <div className="eyebrow">풀업 성장 로직</div>
            <div className="panel-grid">
              <article className="info-card">
                <span className="hero-meta-label">현재 트랙</span>
                <strong>{currentPlan.pullUpMeta.trackLabel}</strong>
                <p>{currentPlan.pullUpMeta.currentTier}</p>
              </article>
              <article className="info-card">
                <span className="hero-meta-label">진행 규칙</span>
                <strong>{currentPlan.pullUpMeta.primaryMovement}</strong>
                <p>{currentPlan.pullUpMeta.progressionRule}</p>
              </article>
            </div>
          </section>
        ) : null}

        <div className="steps">
          {exercises.map((exercise) => {
            const done = completedIds.includes(exercise.id);
            const isRunning = activeTimer?.exerciseId === exercise.id;

            return (
              <article className={done ? "step-card step-card-done" : "step-card"} key={exercise.id}>
                <div className="step-order">순서 {exercise.order}</div>
                <div className="step-top">
                  <div>
                    <h4>{exercise.name}</h4>
                    <p className="step-block-name">{exercise.blockTitle}</p>
                  </div>
                  <TimerChip seconds={exercise.timerSeconds ?? 30} />
                </div>

                <p className="prescription">{exercise.prescription}</p>

                <div className="step-data">
                  <span>{exercise.rest}</span>
                  <span>{exercise.targetRpe}</span>
                  {exercise.stationLabel ? <span>{exercise.stationLabel}</span> : null}
                </div>

                <p>대체 동작: {exercise.substitute}</p>
                <p className="cue">{exercise.coachingCue}</p>

                <div className="step-actions">
                  <button
                    className="secondary-button"
                    onClick={() => startTimer(exercise.id, exercise.name, exercise.timerSeconds)}
                    type="button"
                  >
                    {isRunning ? "타이머 다시 시작" : "타이머 시작"}
                  </button>
                  <button
                    className={done ? "secondary-button" : "primary-button"}
                    onClick={() => completeExercise(exercise.id)}
                    type="button"
                  >
                    {done ? "완료됨" : "이 동작 끝내기"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="session-note">
          <strong>축소 전환 기준</strong>
          <span>{currentPlan.recoveryTriggers.join(" · ") || "폼 붕괴나 통증이 있으면 즉시 축소합니다."}</span>
        </div>

        {activeTimer ? (
          <div className="timer-panel">
            <strong>{activeTimer.exerciseName} 타이머</strong>
            <span>{activeTimer.remainingSeconds}초 남음</span>
          </div>
        ) : null}

        {completionMessage ? <p className="session-status">{completionMessage}</p> : null}
      </section>
      {missedDialog}
    </>
  );
};
