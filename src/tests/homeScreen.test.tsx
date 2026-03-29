import { render, screen } from "@testing-library/react";
import { createPlannerOutput } from "../engines/sessionPlannerEngine";
import { defaultOnboardingProfile } from "../repositories/onboardingProfileRepository";
import { HomeScreen } from "../screens/home/HomeScreen";

describe("HomeScreen", () => {
  it("HomeScreen이 오늘 세션 Hero를 최상단 핵심 요소로 렌더링한다", () => {
    const output = createPlannerOutput({
      date: "2026-03-29",
      profile: defaultOnboardingProfile,
      recoveryState: { date: "2026-03-29", 피로도: 4, 근육통: 3, 수면시간: 7 },
      sessionLogs: []
    });

    render(
      <HomeScreen
        plannerOutput={output}
        onStart={() => undefined}
      />
    );

    expect(screen.getByText("오늘 세션")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: output.hero.세션명 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오늘 루틴 시작" })).toBeInTheDocument();
  });
});
