import { createPlannerOutput } from "../engines/sessionPlannerEngine";
import { defaultOnboardingProfile } from "../repositories/onboardingProfileRepository";

describe("sessionPlanner", () => {
  const baseInput = {
    date: "2026-03-29",
    profile: defaultOnboardingProfile,
    sessionLogs: [
      {
        date: "2026-03-27",
        sessionTemplateId: "fire-duty",
        completed: false,
        intensity: "정상" as const
      }
    ]
  };

  it("planner가 정상 세션 생성", () => {
    const output = createPlannerOutput({
      ...baseInput,
      recoveryState: { date: "2026-03-29", 피로도: 4, 근육통: 3, 수면시간: 7 }
    });

    expect(output.today.세션명).toBe("오늘의 소방 직무형 체력 루틴");
    expect(output.today.블록들[0].운동목록[0].운동명).toBe("트레드밀 빠른 걷기 또는 러닝");
  });

  it("DOMS 시 reduced session 생성", () => {
    const output = createPlannerOutput({
      ...baseInput,
      recoveryState: { date: "2026-03-29", 피로도: 6, 근육통: 7, 수면시간: 6 }
    });

    expect(output.defaultIntensity).toBe("가볍게");
    expect(output.reduced.강도라벨).toBe("가볍게");
  });

  it("recovery 필요 시 recovery session 생성", () => {
    const output = createPlannerOutput({
      ...baseInput,
      recoveryState: { date: "2026-03-29", 피로도: 9, 근육통: 8, 수면시간: 5 }
    });

    expect(output.defaultIntensity).toBe("회복");
    expect(output.recovery.블록들[0].운동목록[0].세트).toBe(2);
  });

  it("missed session action 재계산", () => {
    const output = createPlannerOutput({
      ...baseInput,
      sessionLogs: [
        ...baseInput.sessionLogs,
        {
          date: "2026-03-28",
          sessionTemplateId: "lean-mobility",
          completed: false,
          intensity: "정상" as const
        }
      ],
      recoveryState: { date: "2026-03-29", 피로도: 6, 근육통: 5, 수면시간: 6 }
    });

    expect(output.missedSessionAction).toBe("볼륨 감산 후 재배정");
  });
});
