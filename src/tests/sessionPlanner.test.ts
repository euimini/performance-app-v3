import { createPlannerOutput } from "../engines/sessionPlannerEngine";
import { defaultOnboardingProfile } from "../repositories/onboardingProfileRepository";

describe("sessionPlanner", () => {
  it("anchors the cycle to a firefighter day on 2026-03-29", () => {
    const output = createPlannerOutput({
      date: "2026-03-29",
      profile: defaultOnboardingProfile,
      recoveryState: {
        date: "2026-03-29",
        fatigue: 4,
        upperDoms: 3,
        lowerDoms: 3,
        shoulderStress: 3,
        sleepHours: 7
      },
      sessionLogs: []
    });

    expect(output.todayPlan.baseSessionId).toBe("firefighter-circuit");
    expect(output.todayPlan.title).toBe("소방 서킷 + 왕복오래달리기 대비 Day");
    expect(output.todayPlan.firefighterStations).toHaveLength(6);
  });

  it("downgrades pull day when upper fatigue is high", () => {
    const output = createPlannerOutput({
      date: "2026-03-30",
      profile: defaultOnboardingProfile,
      recoveryState: {
        date: "2026-03-30",
        fatigue: 6,
        upperDoms: 7,
        lowerDoms: 4,
        shoulderStress: 7,
        sleepHours: 6
      },
      sessionLogs: []
    });

    expect(output.baseSessionId).toBe("pull-strength");
    expect(output.todayPlan.version).toBe("reduced");
    expect(output.todayPlan.title).toBe("풀업 축소 Day");
  });

  it("sends a severe fatigue day to recovery", () => {
    const output = createPlannerOutput({
      date: "2026-03-31",
      profile: defaultOnboardingProfile,
      recoveryState: {
        date: "2026-03-31",
        fatigue: 9,
        upperDoms: 8,
        lowerDoms: 8,
        shoulderStress: 8,
        sleepHours: 5
      },
      sessionLogs: []
    });

    expect(output.todayPlan.version).toBe("recovery");
    expect(output.todayPlan.title).toBe("회복 + 가동성 Day");
  });

  it("pulls a missed session back into today instead of hiding it", () => {
    const output = createPlannerOutput({
      date: "2026-04-01",
      profile: defaultOnboardingProfile,
      recoveryState: {
        date: "2026-04-01",
        fatigue: 5,
        upperDoms: 4,
        lowerDoms: 4,
        shoulderStress: 4,
        sleepHours: 7
      },
      sessionLogs: [
        {
          date: "2026-03-31",
          sessionId: "pull-strength-normal",
          baseSessionId: "pull-strength",
          completed: false,
          version: "normal",
          quality: "failed"
        }
      ]
    });

    expect(output.baseSessionId).toBe("pull-strength");
    expect(output.selectedReason[0]).toMatch(/핵심 세션/);
  });
});
