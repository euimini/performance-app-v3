import { render, screen } from "@testing-library/react";
import { createPlannerOutput, createWeeklyPlannerOutput } from "../engines/sessionPlannerEngine";
import { defaultOnboardingProfile } from "../repositories/onboardingProfileRepository";
import { HomeScreen } from "../screens/home/HomeScreen";

const recoveryState = {
  date: "2026-03-29",
  fatigue: 4,
  upperDoms: 3,
  lowerDoms: 3,
  shoulderStress: 3,
  sleepHours: 7
};

describe("HomeScreen", () => {
  it("shows the weekly routine section under today's prescription", () => {
    const plannerOutput = createPlannerOutput({
      date: "2026-03-29",
      profile: defaultOnboardingProfile,
      recoveryState,
      sessionLogs: []
    });

    const weeklyPlan = createWeeklyPlannerOutput(
      {
        date: "2026-03-29",
        profile: defaultOnboardingProfile,
        recoveryState,
        sessionLogs: []
      },
      "2026-03-29",
      () => recoveryState
    );

    render(<HomeScreen plannerOutput={plannerOutput} weeklyPlan={weeklyPlan} onStart={() => undefined} />);

    expect(screen.getByText("오늘 처방")).toBeInTheDocument();
    expect(screen.getByText("이번 주 7일 루틴")).toBeInTheDocument();
    expect(screen.getAllByText(/분/).length).toBeGreaterThan(1);
  });

  it("renders firefighter mapping and weekly cards together", () => {
    const plannerOutput = createPlannerOutput({
      date: "2026-03-29",
      profile: defaultOnboardingProfile,
      recoveryState,
      sessionLogs: []
    });

    const weeklyPlan = createWeeklyPlannerOutput(
      {
        date: "2026-03-29",
        profile: defaultOnboardingProfile,
        recoveryState,
        sessionLogs: []
      },
      "2026-03-29",
      () => recoveryState
    );

    render(<HomeScreen plannerOutput={plannerOutput} weeklyPlan={weeklyPlan} onStart={() => undefined} />);

    expect(screen.getByText("시험 종목 대응")).toBeInTheDocument();
    expect(screen.getByText("계단 오르내리기")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(2);
  });
});
