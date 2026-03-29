import type {
  ExercisePrescription,
  FirefighterStationMapping,
  PullProgressionStep,
  PullTrackLevel,
  SessionBlock,
  SessionCard,
  SessionCategory,
  SessionPriority,
  SessionVersion
} from "../domain/session/types";

type SessionBuildContext = {
  pullTrackLevel: PullTrackLevel;
  progressionStep: PullProgressionStep;
  readinessNote: string;
};

export const cycleOrder = [
  "firefighter-circuit",
  "pull-strength",
  "lower-strength",
  "push-support",
  "recovery-mobility",
  "pull-strength",
  "firefighter-circuit"
] as const;

type SessionRecoveryProfile = {
  priority: SessionPriority;
  recoveryCost: number;
};

const sessionRecoveryProfiles: Record<string, SessionRecoveryProfile> = {
  "pull-strength": { priority: "A", recoveryCost: 4 },
  "push-support": { priority: "C", recoveryCost: 3 },
  "lower-strength": { priority: "B", recoveryCost: 4 },
  "firefighter-circuit": { priority: "A", recoveryCost: 5 },
  "recovery-mobility": { priority: "C", recoveryCost: 1 }
};

export const getSessionRecoveryProfile = (baseSessionId: string): SessionRecoveryProfile =>
  sessionRecoveryProfiles[baseSessionId] ?? { priority: "C", recoveryCost: 2 };

const createExercise = (exercise: ExercisePrescription): ExercisePrescription => exercise;

const createBlock = (
  id: string,
  title: string,
  purpose: string,
  estimatedMinutes: number,
  exercises: ExercisePrescription[]
): SessionBlock => ({
  id,
  title,
  purpose,
  estimatedMinutes,
  exercises
});

const densityLabel = (estimatedMinutes: number, version: SessionVersion) => {
  if (version === "normal") {
    return estimatedMinutes >= 150 ? "고볼륨 2시간 30분+" : "고볼륨 2시간+";
  }

  if (version === "reduced") {
    return "축소 처방 90~120분";
  }

  return "회복 처방 45~90분";
};

const buildCard = (
  id: string,
  baseSessionId: string,
  title: string,
  category: SessionCategory,
  version: SessionVersion,
  summary: string,
  description: string,
  blocks: SessionBlock[],
  fallbackSessionId: string,
  extras?: Partial<SessionCard>
): SessionCard => {
  const estimatedMinutes = blocks.reduce((sum, block) => sum + block.estimatedMinutes, 0);
  const profile = getSessionRecoveryProfile(baseSessionId);

  return {
    id,
    baseSessionId,
    title,
    category,
    version,
    priority: profile.priority,
    recoveryCost: profile.recoveryCost,
    summary,
    description,
    estimatedMinutes,
    densityLabel: densityLabel(estimatedMinutes, version),
    exercises: blocks.flatMap((block) => block.exercises),
    blocks,
    focusTags: [],
    goalTags: [],
    blockedBy: [],
    recommendedWhen: [],
    fallbackSessionId,
    notes: [],
    progressionRules: [],
    recoveryTriggers: [],
    ...extras
  };
};

const warmupBlock = (prefix: string, exercises: ExercisePrescription[], minutes: number) =>
  createBlock(`${prefix}-prep`, "워밍업 스트레칭", "관절을 풀고 본운동 전에 몸을 데웁니다.", minutes, exercises);

const activationBlock = (prefix: string, exercises: ExercisePrescription[], minutes: number) =>
  createBlock(`${prefix}-activation`, "가벼운 예열 동작", "본운동 전에 주동작과 코어를 먼저 깨웁니다.", minutes, exercises);

const cardioFinishBlock = (prefix: string, prescription: string, minutes: number) =>
  createBlock(`${prefix}-cardio`, "유산소 마무리", "감량과 체력 대비를 위해 유산소를 필수로 넣습니다.", minutes, [
    createExercise({
      id: `${prefix}-cardio-main`,
      name: "트레드밀 유산소",
      prescription,
      rest: "지속",
      targetRpe: "RPE 6",
      substitute: "제자리 빠른 보행",
      coachingCue: "세션 후반에도 심박을 일정하게 유지해 감량과 전신 체력을 같이 챙깁니다."
    })
  ]);

const cooldownBlock = (prefix: string, exercises: ExercisePrescription[], minutes: number) =>
  createBlock(`${prefix}-cooldown`, "마무리 스트레칭", "심박을 내리고 다음 세션으로 이어질 수 있게 정리합니다.", minutes, exercises);

const pullPrimaryByTrack = (
  track: PullTrackLevel,
  progressionStep: PullProgressionStep,
  version: SessionVersion
) => {
  if (version === "reduced") {
    if (track === "assisted") {
      return {
        name: "발 보조 풀업 + 네거티브",
        prescription: "5세트 x 4회 + 하강 3초",
        progressionRule: "보조를 줄여도 하강 제어가 유지되면 다음에 총 반복 수를 올립니다.",
        fallbackMovements: ["스캡 풀", "탑 홀드", "데드 행"]
      };
    }

    return {
      name: "품질 싱글 풀업",
      prescription: "6세트 x 1회",
      progressionRule: "모든 싱글이 깨끗하면 다음에 백오프 세트를 추가합니다.",
      fallbackMovements: ["스캡 풀", "탑 홀드", "네거티브"]
    };
  }

  if (track === "assisted") {
    return {
      name: "발 보조 풀업",
      prescription: "6세트 x 5회",
      progressionRule: "모든 세트가 깨끗하면 보조를 줄이고, 그 다음 반복 수를 올립니다.",
      fallbackMovements: ["탑 홀드", "네거티브", "스캡 풀"]
    };
  }

  if (track === "full" && progressionStep === "load") {
    return {
      name: "중량 풀업",
      prescription: "6세트 x 3회",
      progressionRule: "모든 세트가 흔들림 없이 끝나면 다음 주 2.5kg를 더합니다.",
      fallbackMovements: ["품질 싱글", "데드 행", "탑 홀드"]
    };
  }

  if (progressionStep === "density") {
    return {
      name: "클러스터 풀업",
      prescription: "8세트 x 2회, 세트 간 60초",
      progressionRule: "휴식을 15초 줄여도 품질이 유지되면 다음에 총량을 올립니다.",
      fallbackMovements: ["품질 싱글", "네거티브", "데드 행"]
    };
  }

  if (progressionStep === "volume") {
    return {
      name: "볼륨 풀업",
      prescription: "7세트 x 4회",
      progressionRule: "품질이 유지되면 총 반복 수를 2~4회 더합니다.",
      fallbackMovements: ["품질 싱글", "탑 홀드", "스캡 풀"]
    };
  }

  return {
    name: "품질 풀업",
    prescription: "6세트 x 3~4회",
    progressionRule: "반동 없는 반복만 진척으로 계산하고, 그 다음 총량을 올립니다.",
    fallbackMovements: ["품질 싱글", "탑 홀드", "네거티브"]
  };
};

const buildPullCard = (
  version: Extract<SessionVersion, "normal" | "reduced">,
  context: SessionBuildContext
): SessionCard => {
  const isReduced = version === "reduced";
  const primary = pullPrimaryByTrack(context.pullTrackLevel, context.progressionStep, version);

  const blocks = [
    warmupBlock("pull", [
      createExercise({
        id: "pull-warmup-1",
        name: "손바닥 짚고 손목 앞뒤 기울이기",
        prescription: "2라운드 x 10회",
        rest: "라운드 간 20초",
        targetRpe: "RPE 3",
        substitute: "가벼운 악력볼 쥐기",
        coachingCue: "매달림과 그립 볼륨을 받기 전에 전완을 먼저 풉니다."
      }),
      createExercise({
        id: "pull-warmup-2",
        name: "벤치 잡고 광배 늘리기",
        prescription: "2라운드 x 45초",
        rest: "라운드 간 20초",
        targetRpe: "RPE 3",
        substitute: "벽 광배 스트레치",
        coachingCue: "상체가 말린 채로 당기지 않도록 흉추와 광배를 엽니다."
      })
    ], isReduced ? 12 : 15),
    activationBlock("pull", [
      createExercise({
        id: "pull-activation-1",
        name: "풀업바 스캡 풀업",
        prescription: isReduced ? "3세트 x 6회" : "4세트 x 8회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "벽 슬라이드",
        coachingCue: "견갑 제어를 먼저 켜서 상부 승모 개입을 줄입니다."
      }),
      createExercise({
        id: "pull-activation-2",
        name: "데드버그 3초 정지",
        prescription: isReduced ? "3세트 x 8회" : "4세트 x 10회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "할로우 브리딩",
        coachingCue: "코어를 고정해 풀업 하체 흔들림을 줄입니다."
      })
    ], isReduced ? 12 : 15),
    createBlock("pull-main", "메인 풀업 볼륨", "풀업 성장의 핵심 블록입니다.", isReduced ? 25 : 35, [
      createExercise({
        id: "pull-main-1",
        name: primary.name,
        prescription: primary.prescription,
        rest: isReduced ? "세트 간 90초" : "세트 간 120초",
        targetRpe: isReduced ? "RPE 6-7" : "RPE 7-8",
        substitute: primary.fallbackMovements[0],
        coachingCue: "반동 없는 시작, 턱 넘김, 하강 제어를 모두 지킵니다."
      }),
      createExercise({
        id: "pull-main-2",
        name: isReduced ? "탑 홀드 + 네거티브" : "백오프 풀업",
        prescription: isReduced ? "4세트 x 12초 + 3회" : "4세트 x 2~3회",
        rest: "세트 간 75초",
        targetRpe: isReduced ? "RPE 6" : "RPE 7",
        substitute: primary.fallbackMovements[1],
        coachingCue: "품질이 흔들리면 즉시 쉬운 보조 드릴로 바꿉니다."
      })
    ]),
    createBlock("pull-volume", "보조 볼륨/근지구력", "등, 이두, 그립을 충분한 세트 수로 채웁니다.", isReduced ? 20 : 30, [
      createExercise({
        id: "pull-volume-1",
        name: isReduced ? "체스트 서포티드 덤벨 로우" : "바벨 로우",
        prescription: isReduced ? "4세트 x 10회" : "5세트 x 8회",
        rest: "세트 간 75초",
        targetRpe: isReduced ? "RPE 6" : "RPE 8",
        substitute: "원암 덤벨 로우",
        coachingCue: "호스 끌기처럼 팔꿈치를 뒤로 길게 빼며 등 볼륨을 채웁니다."
      }),
      createExercise({
        id: "pull-volume-2",
        name: "덤벨 원암 로우",
        prescription: isReduced ? "3세트 x 10회" : "4세트 x 12회",
        rest: "세트 간 60초",
        targetRpe: "RPE 7",
        substitute: "인클라인 덤벨 로우",
        coachingCue: "좌우 차이를 줄여 호스 끌기 동작을 더 안정적으로 만듭니다."
      }),
      createExercise({
        id: "pull-volume-3",
        name: "해머 컬",
        prescription: isReduced ? "3세트 x 12회" : "4세트 x 12~15회",
        rest: "세트 간 45초",
        targetRpe: "RPE 7",
        substitute: "바벨 컬",
        coachingCue: "그립 지구력과 상완 보조 볼륨을 같이 확보합니다."
      })
    ]),
    createBlock("pull-support", "소방형 보강", "호스 끌기와 장비 버티기를 따로 보강합니다.", isReduced ? 12 : 18, [
      createExercise({
        id: "pull-support-1",
        name: "데드 행",
        prescription: isReduced ? "3세트 x 25초" : "4세트 x 35초",
        rest: "세트 간 45초",
        targetRpe: "RPE 6",
        substitute: primary.fallbackMovements[2],
        coachingCue: "어깨를 끌어내린 상태를 유지해 매달림과 그립을 같이 버팁니다."
      }),
      createExercise({
        id: "pull-support-2",
        name: "프론트랙 홀드",
        prescription: isReduced ? "3세트 x 20초" : "4세트 x 30초",
        rest: "세트 간 45초",
        targetRpe: "RPE 6-7",
        substitute: "덤벨 수트케이스 홀드",
        coachingCue: "장비 들고 버티기 대응으로 흉곽과 전면 코어를 무너지지 않게 씁니다."
      })
    ]),
    cardioFinishBlock("pull", isReduced ? "15분, 심박수 124~143bpm" : "20분, 심박수 124~143bpm", isReduced ? 15 : 20),
    cooldownBlock("pull", [
      createExercise({
        id: "pull-cooldown-1",
        name: "광배 스트레치",
        prescription: "2세트 x 45초",
        rest: "세트 간 15초",
        targetRpe: "RPE 3",
        substitute: "벽 광배 스트레치",
        coachingCue: "당긴 뒤 짧아진 광배를 길게 늘립니다."
      }),
      createExercise({
        id: "pull-cooldown-2",
        name: "90-90 호흡 회복",
        prescription: "2세트 x 2분",
        rest: "세트 간 15초",
        targetRpe: "RPE 2",
        substitute: "누운 복식호흡",
        coachingCue: "심박을 천천히 내려 다음 세션으로 이어집니다."
      })
    ], isReduced ? 10 : 15)
  ];

  return buildCard(
    version === "normal" ? "pull-strength" : "pull-reduced",
    "pull-strength",
    version === "normal" ? "풀업 성장 Day" : "풀업 축소 Day",
    "pull",
    version,
    version === "normal"
      ? "풀업 메인 볼륨, 보조 당기기, 그립, 유산소까지 묶은 고볼륨 당기기 처방입니다."
      : "상체 피로나 미완료 풀 세션이 있을 때도 구조는 유지하는 축소 당기기 처방입니다.",
    version === "normal"
      ? `${context.readinessNote} 품질 반복 → 총량 → 밀도 순으로 진행하는 날입니다.`
      : `${context.readinessNote} 품질이 무너지지 않도록 총량만 줄이고 풀업 감각은 유지합니다.`,
    blocks,
    "recovery-mobility",
    {
      focusTags: ["풀업 집중", "그립", "등 볼륨", "유산소"],
      goalTags: ["pull-up-growth", "2027-firefighter", "fat-loss"],
      pullUpMeta: {
        trackLabel:
          context.pullTrackLevel === "assisted"
            ? "보조 풀업 트랙"
            : context.pullTrackLevel === "full"
              ? "완전 반복 트랙"
              : "저반복 정체 돌파 트랙",
        currentTier:
          context.progressionStep === "quality"
            ? "품질 반복 우선"
            : context.progressionStep === "volume"
              ? "볼륨 누적"
              : context.progressionStep === "density"
                ? "밀도 향상"
                : context.progressionStep === "load"
                  ? "중량 단계"
                  : "회귀 단계",
        primaryMovement: primary.name,
        qualityGate: "반동 없는 시작, 턱 넘김, 하강 제어가 무너지면 반복 수를 인정하지 않습니다.",
        progressionStep: context.progressionStep,
        progressionRule: primary.progressionRule,
        fallbackMovements: primary.fallbackMovements,
        readinessAdjustment:
          version === "normal"
            ? "폼이 무너지면 즉시 축소 Day 또는 회복 Day로 내립니다."
            : "오늘은 풀업 감각 유지가 목표이며, 억지 볼륨은 금지합니다."
      },
      blockedBy: ["어깨/팔꿈치 부담 8 이상", "상체 DOMS 8 이상"],
      recommendedWhen: ["상체 상태가 무난한 날", "회복일 다음"],
      notes: ["이 날은 단순 등운동이 아니라 풀업 성장 전용 세션입니다."],
      progressionRules: [primary.progressionRule],
      recoveryTriggers: ["팔꿈치 통증", "견갑 제어 붕괴", "반동 발생"]
    }
  );
};

const buildPushCard = (version: Extract<SessionVersion, "normal" | "reduced">): SessionCard => {
  const isReduced = version === "reduced";

  const blocks = [
    warmupBlock("push", [
      createExercise({
        id: "push-warmup-1",
        name: "벤치 위 흉추 신전 스트레치",
        prescription: "2세트 x 45초",
        rest: "세트 간 20초",
        targetRpe: "RPE 3",
        substitute: "캣카우",
        coachingCue: "프레스 전에 흉추를 열어 어깨 압박을 줄입니다."
      }),
      createExercise({
        id: "push-warmup-2",
        name: "벤치 가슴 열기 스트레치",
        prescription: "2세트 x 45초",
        rest: "세트 간 20초",
        targetRpe: "RPE 3",
        substitute: "문틀 스트레치",
        coachingCue: "당기기 위주 흐름에서 굳은 전면부를 먼저 풉니다."
      })
    ], isReduced ? 12 : 15),
    activationBlock("push", [
      createExercise({
        id: "push-activation-1",
        name: "벽 슬라이드 + 리프트오프",
        prescription: isReduced ? "3세트 x 8회" : "4세트 x 10회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "프론 Y 레이즈",
        coachingCue: "견갑 상방회전을 살려 어깨 끼임을 줄입니다."
      }),
      createExercise({
        id: "push-activation-2",
        name: "벤치 인클라인 푸시업",
        prescription: isReduced ? "3세트 x 10회" : "4세트 x 12회",
        rest: "세트 간 30초",
        targetRpe: "RPE 5",
        substitute: "벽 푸시업",
        coachingCue: "어깨 통증 없이 밀기 동작을 먼저 가볍게 깨웁니다."
      })
    ], isReduced ? 10 : 14),
    createBlock("push-main", "메인 프레스", "밀기 힘과 상체 지지력을 확보합니다.", isReduced ? 24 : 32, [
      createExercise({
        id: "push-main-1",
        name: isReduced ? "덤벨 플로어 프레스" : "덤벨 벤치프레스",
        prescription: isReduced ? "4세트 x 10회" : "5세트 x 8회",
        rest: isReduced ? "세트 간 75초" : "세트 간 90초",
        targetRpe: isReduced ? "RPE 6-7" : "RPE 7-8",
        substitute: "벤치 푸시업",
        coachingCue: "견갑을 고정하고 가슴으로 밀어냅니다."
      }),
      createExercise({
        id: "push-main-2",
        name: isReduced ? "하프니링 덤벨 프레스" : "덤벨 오버헤드 프레스",
        prescription: isReduced ? "4세트 x 8회" : "5세트 x 6회",
        rest: "세트 간 75초",
        targetRpe: isReduced ? "RPE 6-7" : "RPE 7",
        substitute: "한손 덤벨 프레스",
        coachingCue: "몸통을 고정해 장비를 밀고 버티는 힘을 만듭니다."
      })
    ]),
    createBlock("push-volume", "보조 볼륨/어깨 보호", "밀기 균형과 삼두 지구력을 충분히 채웁니다.", isReduced ? 18 : 26, [
      createExercise({
        id: "push-volume-1",
        name: isReduced ? "덤벨 스캡션" : "덤벨 레터럴 레이즈",
        prescription: isReduced ? "3세트 x 12회" : "4세트 x 15회",
        rest: "세트 간 45초",
        targetRpe: "RPE 6-7",
        substitute: "프론 Y 레이즈",
        coachingCue: "어깨 안정성과 삼각근 볼륨을 같이 챙깁니다."
      }),
      createExercise({
        id: "push-volume-2",
        name: isReduced ? "벤치 딥스 얕게" : "클로즈그립 푸시업",
        prescription: isReduced ? "3세트 x 10회" : "4세트 x 12회",
        rest: "세트 간 45초",
        targetRpe: "RPE 7",
        substitute: "벤치 푸시업",
        coachingCue: "삼두 지구력을 만들어 장비 밀기와 지지 시간을 늘립니다."
      }),
      createExercise({
        id: "push-volume-3",
        name: "프론트랙 홀드",
        prescription: isReduced ? "3세트 x 20초" : "4세트 x 30초",
        rest: "세트 간 45초",
        targetRpe: "RPE 6-7",
        substitute: "덤벨 가슴 앞 홀드",
        coachingCue: "장비 들고 버티기 대응으로 흉곽과 전면 코어를 강화합니다."
      })
    ]),
    createBlock("push-conditioning", "소방형 컨디셔닝", "밀기 날에도 하체와 운반 감각을 끊지 않습니다.", isReduced ? 10 : 16, [
      createExercise({
        id: "push-conditioning-1",
        name: "벤치 스텝업",
        prescription: isReduced ? "2세트 x 각 다리 8회" : "3세트 x 각 다리 10회",
        rest: "세트 간 45초",
        targetRpe: isReduced ? "RPE 6" : "RPE 7",
        substitute: "고블릿 스쿼트",
        coachingCue: "밀기 날에도 계단 적응과 하체 순환을 완전히 끊지 않습니다."
      }),
      createExercise({
        id: "push-conditioning-2",
        name: "덤벨 마치",
        prescription: isReduced ? "2세트 x 25초" : "3세트 x 35초",
        rest: "세트 간 40초",
        targetRpe: isReduced ? "RPE 6" : "RPE 7",
        substitute: "제자리 빠른 보행",
        coachingCue: "좁은 공간에서도 운반 지구력을 유지합니다."
      })
    ]),
    cardioFinishBlock("push", isReduced ? "15분, 심박수 124~143bpm" : "20분, 심박수 124~143bpm", isReduced ? 15 : 20),
    cooldownBlock("push", [
      createExercise({
        id: "push-cooldown-1",
        name: "가슴 스트레치",
        prescription: "2세트 x 45초",
        rest: "세트 간 15초",
        targetRpe: "RPE 3",
        substitute: "문틀 스트레치",
        coachingCue: "전면부 긴장을 늦춰 다음 당기기 세션을 돕습니다."
      }),
      createExercise({
        id: "push-cooldown-2",
        name: "누운 호흡 회복",
        prescription: "2세트 x 2분",
        rest: "세트 간 15초",
        targetRpe: "RPE 2",
        substitute: "앉은 복식호흡",
        coachingCue: "심박을 내리고 회복 반응을 끌어냅니다."
      })
    ], isReduced ? 10 : 14)
  ];

  return buildCard(
    version === "normal" ? "push-support" : "push-reduced",
    "push-support",
    version === "normal" ? "푸시 + 상체 보강 Day" : "푸시 축소 / 어깨 보호 Day",
    "push",
    version,
    version === "normal"
      ? "밀기 힘, 장비 지지력, 어깨 보호, 유산소까지 묶은 상체 균형 세션입니다."
      : "어깨 부담이 있는 날에도 구조는 유지하고 볼륨만 줄인 푸시 세션입니다.",
    version === "normal"
      ? "풀업 우선 흐름의 불균형을 막고 장비 홀드 대응을 함께 키웁니다."
      : "어깨나 팔꿈치가 예민한 날에는 밀기 감각과 회복 흐름만 유지합니다.",
    blocks,
    "recovery-mobility",
    {
      focusTags: ["상체 밀기", "장비 버티기", "어깨 보호", "유산소"],
      goalTags: ["2027-firefighter", "mobility", "fat-loss"],
      blockedBy: ["어깨/팔꿈치 부담 8 이상"],
      recommendedWhen: ["하체는 무겁지만 상체는 가능한 날", "풀업 데이 다음"],
      notes: ["밀기 날도 유산소와 직무형 감각을 빼지 않습니다."],
      progressionRules: ["프레스가 2주 연속 안정되면 중량 또는 반복을 소폭 올립니다."],
      recoveryTriggers: ["전면 어깨 통증", "프레스 중 허리 과신전"]
    }
  );
};

const buildLowerCard = (version: Extract<SessionVersion, "normal" | "reduced">): SessionCard => {
  const isReduced = version === "reduced";

  const blocks = [
    warmupBlock("lower", [
      createExercise({
        id: "lower-warmup-1",
        name: "벽 짚고 무릎 밀기",
        prescription: "2라운드 x 각 발목 10회",
        rest: "라운드 간 20초",
        targetRpe: "RPE 3",
        substitute: "벽 발목 스트레치",
        coachingCue: "계단과 스쿼트 깊이를 위해 발목부터 엽니다."
      }),
      createExercise({
        id: "lower-warmup-2",
        name: "월드그레이티스트 스트레치",
        prescription: "2라운드 x 좌우 5회",
        rest: "라운드 간 20초",
        targetRpe: "RPE 3",
        substitute: "월드그레이티스트 스트레치",
        coachingCue: "고관절이 묶인 상태에서 하체 고볼륨을 받지 않게 준비합니다."
      })
    ], isReduced ? 12 : 15),
    activationBlock("lower", [
      createExercise({
        id: "lower-activation-1",
        name: "바닥 글루트 브리지",
        prescription: isReduced ? "3세트 x 10회" : "4세트 x 12회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "힙 브리지 홀드",
        coachingCue: "둔근을 먼저 켜서 허리 개입을 줄입니다."
      }),
      createExercise({
        id: "lower-activation-2",
        name: "벤치 맨몸 스텝업",
        prescription: isReduced ? "2세트 x 각 다리 8회" : "3세트 x 각 다리 10회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "맨몸 스쿼트",
        coachingCue: "중량 전에 계단 오르기 동작을 부드럽게 만듭니다."
      })
    ], isReduced ? 10 : 14),
    createBlock("lower-main", "메인 하체 힘", "계단, 운반, 구조를 위한 하체 출력을 확보합니다.", isReduced ? 24 : 34, [
      createExercise({
        id: "lower-main-1",
        name: isReduced ? "고블릿 스쿼트" : "바벨 스쿼트",
        prescription: isReduced ? "4세트 x 8회" : "5세트 x 5회",
        rest: isReduced ? "세트 간 75초" : "세트 간 120초",
        targetRpe: isReduced ? "RPE 6-7" : "RPE 8",
        substitute: "덤벨 스쿼트",
        coachingCue: "조끼를 입고 계단을 오른다고 생각하며 몸통을 세운 채 밀어 올립니다."
      }),
      createExercise({
        id: "lower-main-2",
        name: isReduced ? "덤벨 RDL" : "바벨 RDL",
        prescription: isReduced ? "4세트 x 8회" : "5세트 x 6회",
        rest: "세트 간 90초",
        targetRpe: isReduced ? "RPE 6-7" : "RPE 7-8",
        substitute: "바벨 데드리프트 가볍게",
        coachingCue: "인명 구조 대체 동작으로 엉덩이와 햄스트링을 강하게 씁니다."
      })
    ]),
    createBlock("lower-volume", "보조 볼륨/근지구력", "하체 체감 볼륨을 충분히 확보합니다.", isReduced ? 18 : 28, [
      createExercise({
        id: "lower-volume-1",
        name: "덤벨 스텝업",
        prescription: isReduced ? "3세트 x 각 다리 8회" : "4세트 x 각 다리 12회",
        rest: "세트 간 60초",
        targetRpe: isReduced ? "RPE 6" : "RPE 7-8",
        substitute: "벤치 스텝업",
        coachingCue: "계단 반복 적응과 둔근 지구력을 같이 만듭니다."
      }),
      createExercise({
        id: "lower-volume-2",
        name: "불가리안 스플릿 스쿼트",
        prescription: isReduced ? "3세트 x 각 다리 8회" : "4세트 x 각 다리 10회",
        rest: "세트 간 60초",
        targetRpe: "RPE 7",
        substitute: "리버스 런지",
        coachingCue: "좌우 불균형을 줄여 계단과 운반 시 무너지지 않게 합니다."
      }),
      createExercise({
        id: "lower-volume-3",
        name: "월싯 홀드",
        prescription: isReduced ? "3세트 x 30초" : "4세트 x 45초",
        rest: "세트 간 45초",
        targetRpe: "RPE 7",
        substitute: "고블릿 정지 스쿼트",
        coachingCue: "조끼를 메고 버티는 하체 지구력 감각을 채웁니다."
      })
    ]),
    createBlock("lower-support", "운반/버티기 보강", "좁은 공간에서도 운반과 장비 홀드 대응을 유지합니다.", isReduced ? 12 : 18, [
      createExercise({
        id: "lower-support-1",
        name: "덤벨 잡고 제자리 걷기",
        prescription: isReduced ? "3세트 x 25초" : "4세트 x 40초",
        rest: "세트 간 45초",
        targetRpe: isReduced ? "RPE 6" : "RPE 7",
        substitute: "덤벨 수트케이스 홀드",
        coachingCue: "긴 캐리 공간이 없어도 손, 코어, 다리 버티기를 같이 가져갑니다."
      }),
      createExercise({
        id: "lower-support-2",
        name: "프론트랙 홀드",
        prescription: isReduced ? "3세트 x 20초" : "4세트 x 30초",
        rest: "세트 간 45초",
        targetRpe: "RPE 6-7",
        substitute: "덤벨 가슴 앞 홀드",
        coachingCue: "장비 들고 버티기와 전면 코어 지구력을 동시에 강화합니다."
      })
    ]),
    cardioFinishBlock("lower", isReduced ? "15분, 심박수 124~143bpm" : "20분, 심박수 124~143bpm", isReduced ? 15 : 20),
    cooldownBlock("lower", [
      createExercise({
        id: "lower-cooldown-1",
        name: "고관절 굴곡근 스트레치",
        prescription: "2세트 x 45초",
        rest: "세트 간 15초",
        targetRpe: "RPE 3",
        substitute: "런지 홀드",
        coachingCue: "앞쪽 체인을 길게 풀어 다음날 DOMS를 줄입니다."
      }),
      createExercise({
        id: "lower-cooldown-2",
        name: "종아리/햄스트링 정리",
        prescription: "2세트 x 45초",
        rest: "세트 간 15초",
        targetRpe: "RPE 3",
        substitute: "벽 종아리 스트레치",
        coachingCue: "트레드밀과 계단 후 하체를 풀어줍니다."
      })
    ], isReduced ? 10 : 14)
  ];

  return buildCard(
    version === "normal" ? "lower-strength" : "lower-reduced",
    "lower-strength",
    version === "normal" ? "하체 힘 Day" : "하체 축소 + 컨디셔닝 Day",
    "lower",
    version,
    version === "normal"
      ? "하체 힘, 계단 적응, 운반/버티기, 유산소를 묶은 고볼륨 하체 처방입니다."
      : "하체 DOMS가 있어도 하체 감각과 심폐를 유지하는 축소 하체 세션입니다.",
    version === "normal"
      ? "소방 서킷 다음에도 하체 출력이 떨어지지 않게 별도 하체일을 유지합니다."
      : "하체 피로가 높을 때는 중량을 줄이되 구조는 유지합니다.",
    blocks,
    "recovery-mobility",
    {
      focusTags: ["하체 힘", "계단", "운반", "유산소"],
      goalTags: ["2027-firefighter", "fat-loss"],
      blockedBy: ["하체 DOMS 8 이상"],
      recommendedWhen: ["상체 데이 다음", "소방 서킷 후 회복이 괜찮은 주간"],
      notes: ["좁은 공간 환경이라 긴 캐리는 홀드와 마치로 대체합니다."],
      progressionRules: ["스쿼트와 힌지가 2주 연속 안정되면 중량을 소폭 올립니다."],
      recoveryTriggers: ["무릎 통증", "허리 개입 과다", "스텝업 균형 붕괴"]
    }
  );
};

const firefighterStations = (version: SessionVersion): FirefighterStationMapping[] => {
  const isReduced = version === "reduced";

  return [
    {
      stationName: "stair",
      testLabel: "계단 오르내리기",
      movementLabel: "덤벨/벤치 스텝업",
      prescription: isReduced ? "3세트 x 각 다리 10회" : "4세트 x 각 다리 12회",
      rest: "세트 간 45초",
      note: "20kg 조끼 반복 작업 대비로 상체를 세운 채 수행합니다."
    },
    {
      stationName: "hose",
      testLabel: "소방호스 끌고 당기기",
      movementLabel: "원암 덤벨로우 + 덤벨 홀드",
      prescription: isReduced ? "3세트 x 10회 + 마지막 10초 홀드" : "4세트 x 12회 + 마지막 10초 홀드",
      rest: "세트 간 45초",
      note: "타월 없이도 로우와 정적 홀드를 묶어 등과 그립 지구력을 함께 가져갑니다."
    },
    {
      stationName: "carry",
      testLabel: "중량물 운반",
      movementLabel: "덤벨 잡고 제자리 걷기",
      prescription: isReduced ? "3세트 x 30초" : "4세트 x 45초",
      rest: "세트 간 40초",
      note: "긴 이동 대신 제자리 마치와 홀드로 운반 능력을 대체합니다."
    },
    {
      stationName: "rescue",
      testLabel: "인명 구조",
      movementLabel: "바벨 데드리프트",
      prescription: isReduced ? "3세트 x 5회" : "4세트 x 6회",
      rest: "세트 간 60초",
      note: "더미 드래그 대신 힌지 기반 끌어내기 힘을 강하게 살립니다."
    },
    {
      stationName: "hold",
      testLabel: "장비 들고 버티기",
      movementLabel: "프론트랙 홀드",
      prescription: isReduced ? "3세트 x 20초" : "4세트 x 30초",
      rest: "세트 간 40초",
      note: "장비를 들고 버티는 흉곽과 코어 고정을 만듭니다."
    },
    {
      stationName: "shuttle",
      testLabel: "왕복오래달리기 대비",
      movementLabel: "트레드밀 인터벌",
      prescription: isReduced ? "8라운드 x 20초, 143~155bpm" : "10라운드 x 20초, 143~162bpm",
      rest: "라운드 간 40초",
      note: "왕복주 공간이 없으므로 트레드밀 인터벌로 셔틀 리듬을 대체합니다."
    }
  ];
};

const buildFirefighterCard = (version: Extract<SessionVersion, "normal" | "reduced">): SessionCard => {
  const stations = firefighterStations(version);
  const isReduced = version === "reduced";

  const blocks = [
    warmupBlock("firefighter", [
      createExercise({
        id: "firefighter-warmup-1",
        name: "벽 짚고 무릎 밀기",
        prescription: "2라운드 x 각 발목 10회",
        rest: "라운드 간 20초",
        targetRpe: "RPE 3",
        substitute: "벽 발목 스트레치",
        coachingCue: "계단과 셔틀 전 하체 관절을 먼저 준비합니다."
      }),
      createExercise({
        id: "firefighter-warmup-2",
        name: "벤치 흉추 신전 스트레치",
        prescription: "2라운드 x 45초",
        rest: "라운드 간 20초",
        targetRpe: "RPE 3",
        substitute: "벽 슬라이드",
        coachingCue: "당기기와 홀드를 버틸 수 있도록 상체를 엽니다."
      })
    ], isReduced ? 12 : 15),
    activationBlock("firefighter", [
      createExercise({
        id: "firefighter-activation-1",
        name: "풀업바 스캡 풀업",
        prescription: isReduced ? "3세트 x 6회" : "4세트 x 8회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "벽 슬라이드",
        coachingCue: "호스 끌기와 매달림을 대비해 견갑을 먼저 켭니다."
      }),
      createExercise({
        id: "firefighter-activation-2",
        name: "바닥 글루트 브리지",
        prescription: isReduced ? "3세트 x 10회" : "4세트 x 12회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "힙 브리지 홀드",
        coachingCue: "계단과 구조 동작 전에 둔근을 먼저 활성화합니다."
      })
    ], isReduced ? 10 : 14),
    createBlock("firefighter-circuit-a", "소방 종목 1~3", "계단, 끌기, 운반을 이어 수행합니다.", isReduced ? 22 : 30, stations.slice(0, 3).map((station) =>
      createExercise({
        id: `firefighter-${station.stationName}`,
        name: `${station.testLabel} → ${station.movementLabel}`,
        prescription: station.prescription,
        rest: station.rest,
        targetRpe: isReduced ? "RPE 6-7" : "RPE 7-8",
        substitute: station.movementLabel,
        coachingCue: station.note,
        stationName: station.stationName,
        stationLabel: station.testLabel
      })
    )),
    createBlock("firefighter-circuit-b", "소방 종목 4~5", "구조와 버티기를 이어 수행해 후면사슬과 버티기를 통합합니다.", isReduced ? 18 : 26, stations.slice(3, 5).map((station) =>
      createExercise({
        id: `firefighter-${station.stationName}`,
        name: `${station.testLabel} → ${station.movementLabel}`,
        prescription: station.prescription,
        rest: station.rest,
        targetRpe: isReduced ? "RPE 6-7" : "RPE 7-8",
        substitute: station.movementLabel,
        coachingCue: station.note,
        stationName: station.stationName,
        stationLabel: station.testLabel
      })
    )),
    createBlock("firefighter-support", "직무형 근력 보강", "서킷 중 무너지지 않도록 추가 힘과 근지구력을 보강합니다.", isReduced ? 14 : 20, [
      createExercise({
        id: "firefighter-support-1",
        name: "덤벨 스텝업",
        prescription: isReduced ? "2세트 x 각 다리 8회" : "3세트 x 각 다리 10회",
        rest: "세트 간 45초",
        targetRpe: isReduced ? "RPE 6" : "RPE 7",
        substitute: "맨몸 스텝업",
        coachingCue: "계단 스테이션 후반에도 리듬이 무너지지 않게 합니다."
      }),
      createExercise({
        id: "firefighter-support-2",
        name: "바벨 로우",
        prescription: isReduced ? "3세트 x 8회" : "4세트 x 10회",
        rest: "세트 간 60초",
        targetRpe: isReduced ? "RPE 6-7" : "RPE 7-8",
        substitute: "덤벨 원암 로우",
        coachingCue: "호스 끌기 후반에도 힘이 빠지지 않도록 등 볼륨을 추가합니다."
      })
    ]),
    createBlock("firefighter-shuttle", "왕복오래달리기 대비", "직무 스테이션 뒤 심폐를 유지하는 실제 느낌을 만듭니다.", isReduced ? 16 : 22, [
      createExercise({
        id: "firefighter-shuttle-1",
        name: `${stations[5].testLabel} → ${stations[5].movementLabel}`,
        prescription: stations[5].prescription,
        rest: stations[5].rest,
        targetRpe: isReduced ? "RPE 7" : "RPE 8",
        substitute: "제자리 빠른 발 옮기기",
        coachingCue: stations[5].note,
        timerSeconds: 20,
        stationName: "shuttle",
        stationLabel: stations[5].testLabel
      }),
      createExercise({
        id: "firefighter-shuttle-2",
        name: "트레드밀 지속주",
        prescription: isReduced ? "12분, 심박수 124~143bpm" : "18분, 심박수 124~143bpm",
        rest: "지속",
        targetRpe: isReduced ? "RPE 6" : "RPE 6-7",
        substitute: "빠른 걷기",
        coachingCue: "인터벌 뒤에도 심박을 유지해 순환식 체력 수행을 준비합니다."
      })
    ]),
    cooldownBlock("firefighter", [
      createExercise({
        id: "firefighter-cooldown-1",
        name: "고관절 굴곡근 스트레치",
        prescription: "2세트 x 45초",
        rest: "세트 간 15초",
        targetRpe: "RPE 3",
        substitute: "런지 홀드",
        coachingCue: "계단과 셔틀 후 굳은 앞쪽 체인을 풀어줍니다."
      }),
      createExercise({
        id: "firefighter-cooldown-2",
        name: "광배 스트레치 + 호흡",
        prescription: "2세트 x 2분",
        rest: "세트 간 15초",
        targetRpe: "RPE 2",
        substitute: "누운 복식호흡",
        coachingCue: "당기기와 홀드 후 상체 긴장을 풀고 심박을 내립니다."
      })
    ], isReduced ? 10 : 14)
  ];

  return buildCard(
    version === "normal" ? "firefighter-circuit" : "firefighter-circuit-reduced",
    "firefighter-circuit",
    version === "normal" ? "소방 서킷 + 왕복오래달리기 대비 Day" : "소방 서킷 축소 Day",
    "firefighter",
    version,
    version === "normal"
      ? "시험 순서를 반영한 6개 스테이션과 유산소 마무리를 묶은 핵심 소방 대비 세션입니다."
      : "소방 체력 흐름은 유지하되 스테이션 볼륨과 인터벌 양을 줄인 축소 세션입니다.",
    version === "normal"
      ? "20kg 조끼, 반복 작업, 운반, 끌기, 구조, 홀드, 셔틀 대응을 현재 장비 환경으로 최대한 현실적으로 바꿨습니다."
      : "피로나 DOMS가 있더라도 소방형 리듬 자체는 놓치지 않도록 구조를 유지합니다.",
    blocks,
    "recovery-mobility",
    {
      focusTags: ["소방 서킷", "운반", "셔틀 대비", "그립"],
      goalTags: ["2027-firefighter", "fat-loss"],
      firefighterStations: stations,
      blockedBy: ["상체 DOMS 8 이상", "하체 DOMS 8 이상", "전신 피로 8 이상"],
      recommendedWhen: ["주간 시작", "회복일 다음", "상하체가 동시에 버틸 수 있는 날"],
      notes: ["실제 드래그와 장거리 캐리는 현재 환경에 맞게 홀드, 마치, 데드리프트로 바꿉니다."],
      progressionRules: ["모든 스테이션이 안정되면 다음엔 시간 또는 반복을 올립니다."],
      recoveryTriggers: ["계단 동작 붕괴", "로우에서 허리 개입 과다", "인터벌 중 보폭 통제 불가"]
    }
  );
};

const buildRecoveryCard = (): SessionCard => {
  const blocks = [
    warmupBlock("recovery", [
      createExercise({
        id: "recovery-warmup-1",
        name: "목-어깨-고관절 제자리 관절 순환",
        prescription: "2라운드 x 2분",
        rest: "라운드 간 30초",
        targetRpe: "RPE 2",
        substitute: "전신 제자리 스트레칭",
        coachingCue: "움직이지 않던 관절을 천천히 깨웁니다."
      }),
      createExercise({
        id: "recovery-warmup-2",
        name: "캣카우 + 흉추 회전",
        prescription: "2라운드 x 각 6회",
        rest: "라운드 간 20초",
        targetRpe: "RPE 2",
        substitute: "누운 가슴 열기",
        coachingCue: "허리와 흉추를 부드럽게 움직여 회복 세션에 들어갑니다."
      })
    ], 10),
    createBlock("recovery-cardio", "가벼운 유산소", "회복 흐름을 만들기 위해 혈류와 호흡을 먼저 살립니다.", 18, [
      createExercise({
        id: "recovery-cardio-1",
        name: "트레드밀 회복 걷기",
        prescription: "18분, 심박수 105~124bpm",
        rest: "지속",
        targetRpe: "RPE 5",
        substitute: "실내 제자리 걷기",
        coachingCue: "숨은 살짝만 올리고 피로는 더 남기지 않습니다."
      })
    ]),
    createBlock("recovery-mobility", "전신 가동성", "상체와 하체가 다시 정상적으로 움직이게 가동범위를 복구합니다.", 18, [
      createExercise({
        id: "recovery-mobility-1",
        name: "고관절 굴곡근 스트레치",
        prescription: "2세트 x 45초",
        rest: "세트 간 20초",
        targetRpe: "RPE 3",
        substitute: "런지 홀드",
        coachingCue: "계단과 스쿼트로 굳은 앞쪽 라인을 길게 늘립니다."
      }),
      createExercise({
        id: "recovery-mobility-2",
        name: "벤치 흉추 신전 스트레치",
        prescription: "2세트 x 45초",
        rest: "세트 간 20초",
        targetRpe: "RPE 3",
        substitute: "캣카우",
        coachingCue: "풀업과 프레스에서 말린 상체를 다시 엽니다."
      }),
      createExercise({
        id: "recovery-mobility-3",
        name: "종아리/발목 정리",
        prescription: "2세트 x 60초",
        rest: "세트 간 15초",
        targetRpe: "RPE 3",
        substitute: "벽 종아리 스트레치",
        coachingCue: "트레드밀과 계단 동작으로 굳은 발목을 풀어줍니다."
      })
    ]),
    createBlock("recovery-pattern", "가볍게 몸풀기", "회복일에도 완전 공백이 아니라 가벼운 움직임을 이어갑니다.", 14, [
      createExercise({
        id: "recovery-pattern-1",
        name: "스캡 풀",
        prescription: "3세트 x 6회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "벽 슬라이드",
        coachingCue: "풀업 감각을 완전히 끊지 않고 견갑만 부드럽게 살립니다."
      }),
      createExercise({
        id: "recovery-pattern-2",
        name: "맨몸 스쿼트",
        prescription: "3세트 x 12회",
        rest: "세트 간 30초",
        targetRpe: "RPE 4",
        substitute: "스텝업",
        coachingCue: "하체 움직임을 가볍게 유지하되 피로는 남기지 않습니다."
      })
    ]),
    cooldownBlock("recovery", [
      createExercise({
        id: "recovery-cooldown-1",
        name: "90-90 호흡",
        prescription: "2세트 x 3분",
        rest: "세트 간 15초",
        targetRpe: "RPE 2",
        substitute: "누운 복식호흡",
        coachingCue: "심박을 낮추고 회복 반응을 끌어냅니다."
      })
    ], 10)
  ];

  return buildCard(
    "recovery-mobility",
    "recovery-mobility",
    "회복 + 가동성 Day",
    "recovery",
    "recovery",
    "완전 공백이 아니라 유산소, 가동성, 가벼운 몸풀기, 호흡 회복까지 묶은 회복 세션입니다.",
    "피로가 높거나 DOMS가 큰 날에는 무리한 완료보다 회복 세션을 제대로 수행하는 편이 전체 흐름에 더 유리합니다.",
    blocks,
    "recovery-mobility",
    {
      focusTags: ["가동성", "회복", "가벼운 유산소"],
      goalTags: ["recovery", "mobility", "fat-loss"],
      blockedBy: [],
      recommendedWhen: ["전신 피로가 높은 날", "수면이 크게 부족한 날", "미완료 세션 다음"],
      notes: ["회복일도 45분 이상 실제로 움직이는 날로 구성합니다."],
      progressionRules: ["회복일 다음날 피로가 내려가면 축소 또는 기본 처방으로 재진입합니다."],
      recoveryTriggers: ["피로도 8 이상", "상하체 DOMS 동시 고강도", "수면 5시간 미만"]
    }
  );
};

export const buildSessionCard = (
  baseSessionId: string,
  version: SessionVersion,
  context: SessionBuildContext
): SessionCard => {
  if (baseSessionId === "pull-strength") {
    return version === "recovery"
      ? { ...buildRecoveryCard(), id: "pull-strength-recovery", baseSessionId: "pull-strength", fallbackSessionId: "pull-reduced" }
      : buildPullCard(version, context);
  }

  if (baseSessionId === "push-support") {
    return version === "recovery"
      ? { ...buildRecoveryCard(), id: "push-support-recovery", baseSessionId: "push-support", fallbackSessionId: "push-reduced" }
      : buildPushCard(version);
  }

  if (baseSessionId === "lower-strength") {
    return version === "recovery"
      ? { ...buildRecoveryCard(), id: "lower-strength-recovery", baseSessionId: "lower-strength", fallbackSessionId: "lower-reduced" }
      : buildLowerCard(version);
  }

  if (baseSessionId === "firefighter-circuit") {
    return version === "recovery"
      ? {
          ...buildRecoveryCard(),
          id: "firefighter-circuit-recovery",
          baseSessionId: "firefighter-circuit",
          fallbackSessionId: "firefighter-circuit-reduced"
        }
      : buildFirefighterCard(version);
  }

  return buildRecoveryCard();
};
