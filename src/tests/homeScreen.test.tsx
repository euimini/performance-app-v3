import { render, screen } from "@testing-library/react";
import { createPlannerOutput, createWeeklyPlannerOutput } from "../engines/sessionPlannerEngine";
import { defaultOnboardingProfile } from "../repositories/onboardingProfileRepository";
import { HomeScreen } from "../screens/home/HomeScreen";

const recoveryState = {
  date: "2026-03-30",
  fatigue: 4,
  upperDoms: 3,
  lowerDoms: 3,
  shoulderStress: 3,
  sleepHours: 7
};

describe("HomeScreen", () => {
  it("오늘 처방 아래에 앞으로 6일 루틴을 보여준다", () => {
    const plannerOutput = createPlannerOutput({
      date: "2026-03-30",
      profile: defaultOnboardingProfile,
      recoveryState,
      sessionLogs: []
    });

    const weeklyPlan = createWeeklyPlannerOutput(
      {
        date: "2026-03-30",
        profile: defaultOnboardingProfile,
        recoveryState,
        sessionLogs: []
      },
      "2026-03-30",
      () => recoveryState
    );

    render(<HomeScreen plannerOutput={plannerOutput} weeklyPlan={weeklyPlan} onStart={() => undefined} />);

    expect(screen.getByText("앞으로 6일 루틴")).toBeInTheDocument();
    expect(screen.getByText("2026-03-30 ~ 2026-04-04")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/주간 루틴 2026-/).length).toBe(6);
  });

  it("소방 종목 대응과 롤링 루틴 카드가 함께 렌더링된다", () => {
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

    expect(screen.getByText("소방 종목 대응")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(2);
  });
});
