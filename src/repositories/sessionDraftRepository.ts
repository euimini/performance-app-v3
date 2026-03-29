import type { SessionDraft } from "../domain/session/types";
import { readStorage, removeStorage, writeStorage } from "../store/localStore";

const DRAFT_KEY = "performance-app-v3/session-draft";

type LegacyDraft = SessionDraft & {
  selectedPlanId?: string;
  selectedIntensity?: "정상" | "가볍게" | "회복";
};

const normalizeDraft = (draft?: LegacyDraft): SessionDraft | undefined => {
  if (!draft) {
    return undefined;
  }

  const selectedVersion =
    draft.selectedVersion ??
    (draft.selectedIntensity === "가볍게"
      ? "reduced"
      : draft.selectedIntensity === "회복"
        ? "recovery"
        : "normal");

  return {
    date: draft.date,
    selectedSessionId: draft.selectedSessionId ?? draft.selectedPlanId ?? "pull-strength-normal",
    selectedVersion,
    startedAt: draft.startedAt
  };
};

export const loadSessionDraft = (): SessionDraft | undefined => {
  const saved = readStorage<LegacyDraft>(DRAFT_KEY);
  return normalizeDraft(saved);
};

export const saveSessionDraft = (draft: SessionDraft) => {
  writeStorage(DRAFT_KEY, draft);
};

export const clearSessionDraft = () => {
  removeStorage(DRAFT_KEY);
};
