import { useEffect, useMemo, useRef, useState } from "react";

export type ExerciseTimerSetup = {
  totalRounds: number;
  roundLabel: "세트" | "라운드" | "진행";
  workSeconds: number;
  restSeconds: number;
  usedFallbackWorkSeconds: boolean;
};

export type ExerciseTimerState = {
  status: "idle" | "running" | "paused" | "finished";
  phase: "work" | "rest";
  currentRound: number;
  remainingSeconds: number;
};

const readSeconds = (value: string) => {
  const match = value.match(/(\d+)\s*(초|분)/);
  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  return match[2] === "분" ? amount * 60 : amount;
};

export const buildExerciseTimerSetup = (
  prescription: string,
  timerSeconds?: number,
  restLabel?: string
): ExerciseTimerSetup => {
  const roundsMatch = prescription.match(/(\d+)\s*(세트|라운드)/);
  const totalRounds = roundsMatch ? Math.max(1, Number(roundsMatch[1])) : 1;
  const roundLabel =
    roundsMatch?.[2] === "라운드"
      ? "라운드"
      : roundsMatch?.[2] === "세트"
        ? "세트"
        : "진행";

  const durationFromCross = prescription.match(/x\s*(\d+)\s*(초|분)/);
  const durationFromPrescription = durationFromCross
    ? Number(durationFromCross[1]) * (durationFromCross[2] === "분" ? 60 : 1)
    : readSeconds(prescription);

  const workSeconds = timerSeconds ?? durationFromPrescription ?? 30;
  const restSeconds = !restLabel || restLabel.includes("지속") ? 0 : readSeconds(restLabel) ?? 0;

  return {
    totalRounds,
    roundLabel,
    workSeconds,
    restSeconds,
    usedFallbackWorkSeconds: timerSeconds === undefined && durationFromPrescription === undefined
  };
};

const initialState = (setup: ExerciseTimerSetup): ExerciseTimerState => ({
  status: "idle",
  phase: "work",
  currentRound: 1,
  remainingSeconds: setup.workSeconds
});

type UseExerciseTimerOptions = {
  setup: ExerciseTimerSetup;
  isDone?: boolean;
  onFinishAllRounds?: () => void;
};

export const useExerciseTimer = ({
  setup,
  isDone = false,
  onFinishAllRounds
}: UseExerciseTimerOptions) => {
  const [state, setState] = useState<ExerciseTimerState>(() => initialState(setup));
  const finishNotifiedRef = useRef(false);

  useEffect(() => {
    setState(initialState(setup));
    finishNotifiedRef.current = false;
  }, [setup]);

  useEffect(() => {
    if (!isDone) {
      return;
    }

    setState((current) => ({
      ...current,
      status: "finished",
      phase: "work",
      currentRound: setup.totalRounds,
      remainingSeconds: 0
    }));
  }, [isDone, setup.totalRounds]);

  useEffect(() => {
    if (state.status !== "running") {
      return;
    }

    const timerId = window.setInterval(() => {
      setState((current) => {
        if (current.status !== "running") {
          return current;
        }

        if (current.remainingSeconds > 1) {
          return { ...current, remainingSeconds: current.remainingSeconds - 1 };
        }

        if (current.phase === "work") {
          if (current.currentRound >= setup.totalRounds) {
            return {
              ...current,
              status: "finished",
              remainingSeconds: 0
            };
          }

          if (setup.restSeconds > 0) {
            return {
              ...current,
              phase: "rest",
              remainingSeconds: setup.restSeconds
            };
          }

          return {
            ...current,
            currentRound: current.currentRound + 1,
            phase: "work",
            remainingSeconds: setup.workSeconds
          };
        }

        return {
          ...current,
          currentRound: Math.min(current.currentRound + 1, setup.totalRounds),
          phase: "work",
          remainingSeconds: setup.workSeconds
        };
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [setup.restSeconds, setup.totalRounds, setup.workSeconds, state.status]);

  useEffect(() => {
    if (state.status !== "finished" || finishNotifiedRef.current) {
      return;
    }

    finishNotifiedRef.current = true;
    onFinishAllRounds?.();
  }, [onFinishAllRounds, state.status]);

  const actions = useMemo(
    () => ({
      start: () => {
        finishNotifiedRef.current = false;
        setState({
          status: "running",
          phase: "work",
          currentRound: 1,
          remainingSeconds: setup.workSeconds
        });
      },
      pause: () => {
        setState((current) => ({ ...current, status: "paused" }));
      },
      resume: () => {
        setState((current) => ({ ...current, status: "running" }));
      },
      restartCurrent: () => {
        finishNotifiedRef.current = false;
        setState((current) => ({
          ...current,
          status: "running",
          remainingSeconds: current.phase === "rest" ? setup.restSeconds : setup.workSeconds
        }));
      },
      moveToNext: () => {
        finishNotifiedRef.current = false;
        setState((current) => {
          if (current.status === "finished") {
            return current;
          }

          if (current.phase === "rest") {
            return {
              ...current,
              status: "running",
              phase: "work",
              currentRound: Math.min(current.currentRound + 1, setup.totalRounds),
              remainingSeconds: setup.workSeconds
            };
          }

          if (current.currentRound >= setup.totalRounds) {
            return {
              ...current,
              status: "finished",
              remainingSeconds: 0
            };
          }

          if (setup.restSeconds > 0) {
            return {
              ...current,
              status: "running",
              phase: "rest",
              remainingSeconds: setup.restSeconds
            };
          }

          return {
            ...current,
            status: "running",
            phase: "work",
            currentRound: current.currentRound + 1,
            remainingSeconds: setup.workSeconds
          };
        });
      },
      reset: () => {
        finishNotifiedRef.current = false;
        setState(initialState(setup));
      }
    }),
    [setup]
  );

  return {
    setup,
    state,
    actions
  };
};
