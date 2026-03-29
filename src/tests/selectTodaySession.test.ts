import { createPlannerOutput } from "../engines/sessionPlannerEngine";
import { defaultOnboardingProfile } from "../repositories/onboardingProfileRepository";
import { selectTodaySession } from "../selectors/selectTodaySession";

describe("selectTodaySession", () => {
  it("draft에 맞는 today session 선택", () => {
    const output = createPlannerOutput({
      date: "2026-03-29",
      profile: defaultOnboardingProfile,
      recoveryState: { date: "2026-03-29", 피로도: 4, 근육통: 3, 수면시간: 7 },
      sessionLogs: []
    });

    const selected = selectTodaySession(output, {
      date: "2026-03-29",
      selectedPlanId: output.recovery.id,
      selectedIntensity: "회복"
    });

    expect(selected.intensity).toBe("회복");
    expect(selected.selectedPlan.강도라벨).toBe("회복");
  });
});
