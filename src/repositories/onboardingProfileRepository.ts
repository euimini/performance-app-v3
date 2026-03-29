import type { OnboardingProfile } from "../domain/session/types";
import { readStorage, writeStorage } from "../store/localStore";

const PROFILE_KEY = "performance-app-v3/onboarding-profile";

export const defaultOnboardingProfile: OnboardingProfile = {
  primaryGoals: ["2027 소방 체력 준비", "풀업 성장", "체지방 감량", "가동성 회복"],
  equipment: ["바벨", "덤벨", "벤치", "풀업바", "트레드밀"],
  constraints: ["좁은 공간", "경사 없는 트레드밀", "썰매·더미 없음", "크로스핏 박스 환경 아님"],
  pullTrackLevel: "plateau"
};

export const loadOnboardingProfile = (): OnboardingProfile => {
  const saved = readStorage<OnboardingProfile>(PROFILE_KEY);
  if (saved) {
    return { ...defaultOnboardingProfile, ...saved };
  }

  writeStorage(PROFILE_KEY, defaultOnboardingProfile);
  return defaultOnboardingProfile;
};
