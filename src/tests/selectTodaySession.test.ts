import { createPlannerOutput } from "../engines/sessionPlannerEngine";
import { defaultOnboardingProfile } from "../repositories/onboardingProfileRepository";
import { selectTodaySession } from "../selectors/selectTodaySession";

describe("selectTodaySession", () => {
  it("uses the manually selected version from draft", () => {
    const output = createPlannerOutput({
      date: "2026-03-30",
      profile: defaultOnboardingProfile,
      recoveryState: {
        date: "2026-03-30",
        fatigue: 4,
        upperDoms: 3,
        lowerDoms: 3,
        shoulderStress: 3,
        sleepHours: 7
      },
      sessionLogs: []
    });

    const selected = selectTodaySession(output, {
      date: "2026-03-30",
      selectedSessionId: output.availablePlans.recovery.id,
      selectedVersion: "recovery"
    });

    expect(selected.version).toBe("recovery");
    expect(selected.selectedPlan.title).toBe("회복 + 가동성 Day");
  });
});
