import { createPlannerOutput, createWeeklyPlannerOutput } from "../engines/sessionPlannerEngine";
import { defaultOnboardingProfile } from "../repositories/onboardingProfileRepository";

const healthyRecovery = {
  date: "2026-03-30",
  fatigue: 4,
  upperDoms: 3,
  lowerDoms: 3,
  shoulderStress: 3,
  sleepHours: 7
};

describe("missed session rescheduling", () => {
  it("re-prioritizes a missed core session when the reason was schedule", () => {
    const output = createPlannerOutput({
      date: "2026-03-30",
      profile: defaultOnboardingProfile,
      recoveryState: healthyRecovery,
      sessionLogs: [
        {
          date: "2026-03-29",
          sessionId: "firefighter-circuit-normal",
          baseSessionId: "firefighter-circuit",
          completed: false,
          version: "normal",
          quality: "failed",
          missedReason: "schedule"
        }
      ]
    });

    expect(output.baseSessionId).toBe("firefighter-circuit");
    expect(output.todayPlan.version).toBe("normal");
    expect(output.selectedReason[0]).toMatch(/핵심 세션/);
  });

  it("downgrades a missed session to reduced when the reason was fatigue", () => {
    const output = createPlannerOutput({
      date: "2026-03-30",
      profile: defaultOnboardingProfile,
      recoveryState: healthyRecovery,
      sessionLogs: [
        {
          date: "2026-03-29",
          sessionId: "firefighter-circuit-normal",
          baseSessionId: "firefighter-circuit",
          completed: false,
          version: "normal",
          quality: "failed",
          missedReason: "fatigue"
        }
      ]
    });

    expect(output.baseSessionId).toBe("firefighter-circuit");
    expect(output.todayPlan.version).toBe("reduced");
    expect(output.warnings.join(" ")).toMatch(/축소/);
  });

  it("downgrades a missed session to recovery when the reason was pain", () => {
    const output = createPlannerOutput({
      date: "2026-03-30",
      profile: defaultOnboardingProfile,
      recoveryState: healthyRecovery,
      sessionLogs: [
        {
          date: "2026-03-29",
          sessionId: "pull-strength-normal",
          baseSessionId: "pull-strength",
          completed: false,
          version: "normal",
          quality: "failed",
          missedReason: "pain"
        }
      ]
    });

    expect(output.baseSessionId).toBe("pull-strength");
    expect(output.todayPlan.version).toBe("recovery");
    expect(output.todayPlan.title).toBe("회복 + 가동성 Day");
  });

  it("keeps only core backlog sessions when two or more sessions are missed", () => {
    const output = createPlannerOutput({
      date: "2026-04-02",
      profile: defaultOnboardingProfile,
      recoveryState: {
        ...healthyRecovery,
        date: "2026-04-02"
      },
      sessionLogs: [
        {
          date: "2026-03-30",
          sessionId: "pull-strength-normal",
          baseSessionId: "pull-strength",
          completed: false,
          version: "normal",
          quality: "failed",
          missedReason: "schedule"
        },
        {
          date: "2026-03-31",
          sessionId: "push-support-normal",
          baseSessionId: "push-support",
          completed: false,
          version: "normal",
          quality: "failed",
          missedReason: "schedule"
        },
        {
          date: "2026-04-01",
          sessionId: "firefighter-circuit-normal",
          baseSessionId: "firefighter-circuit",
          completed: false,
          version: "normal",
          quality: "failed",
          missedReason: "schedule"
        }
      ]
    });

    expect(output.baseSessionId).toBe("pull-strength");
    expect(output.warnings.join(" ")).toMatch(/2회 이상/);
    expect(output.selectedReason[0]).toMatch(/핵심 세션만 남기고 재정렬/);
  });

  it("uses the same missed-session recalculation in the weekly planner", () => {
    const plannerOutput = createPlannerOutput({
      date: "2026-03-30",
      profile: defaultOnboardingProfile,
      recoveryState: healthyRecovery,
      sessionLogs: [
        {
          date: "2026-03-29",
          sessionId: "firefighter-circuit-normal",
          baseSessionId: "firefighter-circuit",
          completed: false,
          version: "normal",
          quality: "failed",
          missedReason: "schedule"
        }
      ]
    });

    const weekly = createWeeklyPlannerOutput(
      {
        date: "2026-03-30",
        profile: defaultOnboardingProfile,
        recoveryState: healthyRecovery,
        sessionLogs: [
          {
            date: "2026-03-29",
            sessionId: "firefighter-circuit-normal",
            baseSessionId: "firefighter-circuit",
            completed: false,
            version: "normal",
            quality: "failed",
            missedReason: "schedule"
          }
        ]
      },
      "2026-03-30",
      () => healthyRecovery
    );

    const todayItem = weekly.items.find((item) => item.date === "2026-03-30");

    expect(todayItem?.sessionTitle).toBe(plannerOutput.todayPlan.title);
    expect(todayItem?.warnings.join(" ")).toMatch(/핵심 세션/);
  });
});
