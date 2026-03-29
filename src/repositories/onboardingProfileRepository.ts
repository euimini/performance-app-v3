import type { OnboardingProfile } from "../domain/session/types";
import { readStorage, writeStorage } from "../store/localStore";

const PROFILE_KEY = "performance-app-v3/onboarding-profile";

export const defaultOnboardingProfile: OnboardingProfile = {
  주요목표: ["감량", "턱걸이 성장", "소방 직무형 체력", "유연성", "회복"],
  장비: ["바벨", "덤벨", "트레드밀", "벤치", "철봉"],
  제약: ["좁은 공간", "왕복달리기 직접 재현 불가", "경사 없는 트레드밀", "긴 캐리 어려움"]
};

export const loadOnboardingProfile = (): OnboardingProfile => {
  const saved = readStorage<OnboardingProfile>(PROFILE_KEY);
  if (saved) {
    return saved;
  }

  writeStorage(PROFILE_KEY, defaultOnboardingProfile);
  return defaultOnboardingProfile;
};
