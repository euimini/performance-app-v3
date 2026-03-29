import type { PlannerOutput, SessionDraft } from "../../domain/session/types";
import { HomeHeroCard } from "../../components/cards/HomeHeroCard";
import { selectTodaySession } from "../../selectors/selectTodaySession";

type ScenarioKey = "기본" | "근육통 높음" | "회복 우선" | "미완료 2회";

type TrainingWindowItem = {
  label: string;
  date: string;
  sessionName: string;
  summary: string;
  exercises: string[];
};

type HomeScreenProps = {
  plannerOutput: PlannerOutput;
  draft?: SessionDraft;
  onStart: () => void;
  trainingWindow?: TrainingWindowItem[];
};

export const HomeScreen = ({
  plannerOutput,
  draft,
  onStart,
  trainingWindow = []
}: HomeScreenProps) => {
  const selection = selectTodaySession(plannerOutput, draft);

  return (
    <div className="screen-stack">
      <HomeHeroCard hero={selection.hero} onStart={onStart} />

      <section className="quick-log-card">
        <div className="eyebrow">어제 · 오늘 · 내일</div>
        <h2>3일 훈련 흐름을 한 번에 봅니다.</h2>
        <div className="training-window">
          {trainingWindow.map((item) => (
            <article className={item.label === "오늘" ? "window-card current" : "window-card"} key={item.label}>
              <div className="window-label">{item.label}</div>
              <strong>{item.sessionName}</strong>
              <p>{item.summary}</p>
              <ul className="window-exercise-list">
                {item.exercises.map((exercise) => (
                  <li key={`${item.label}-${exercise}`}>{exercise}</li>
                ))}
              </ul>
              <span>{item.date}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
