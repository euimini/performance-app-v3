import type { SessionDraft } from "../domain/session/types";
import { readStorage, removeStorage, writeStorage } from "../store/localStore";

const DRAFT_KEY = "performance-app-v3/session-draft";

export const loadSessionDraft = (): SessionDraft | undefined =>
  readStorage<SessionDraft>(DRAFT_KEY);

export const saveSessionDraft = (draft: SessionDraft) => {
  writeStorage(DRAFT_KEY, draft);
};

export const clearSessionDraft = () => {
  removeStorage(DRAFT_KEY);
};
