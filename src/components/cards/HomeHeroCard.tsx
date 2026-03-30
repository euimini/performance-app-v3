import type { PlannerOutput } from "../../domain/session/types";

type HomeHeroCardProps = {
  plannerOutput: PlannerOutput;
  onStart: () => void;
};

const priorityLabel = (priority: PlannerOutput["cardPriority"]) =>
  priority === "firefighter" ? "소방 체력 우선" : priority === "pull-up" ? "턱걸이 성장 우선" : "회복 조정 반영";

const versionLabel = (version: PlannerOutput["todayPlan"]["version"]) =>
  version === "normal" ? "기본 처방" : version === "reduced" ? "축소 처방" : "회복 처방";

export const HomeHeroCard = ({ plannerOutput, onStart }: HomeHeroCardProps) => (
  <section className="hero-card hero-card-strong">
    <div className="hero-topline">
      <span className="eyebrow">오늘 세션</span>
      <div className="hero-chip-row">
        <span className="hero-chip">{plannerOutput.phase}</span>
        <span className="hero-chip subtle">{priorityLabel(plannerOutput.cardPriority)}</span>
      </div>
    </div>

    <h1>{plannerOutput.todayPlan.title}</h1>
    <p className="hero-purpose">{plannerOutput.todayPlan.summary}</p>
    <p className="hero-summary">{plannerOutput.todayPlan.description}</p>

    <div className="hero-meta">
      <div className="hero-meta-item">
        <span className="hero-meta-label">버전</span>
        <strong>{versionLabel(plannerOutput.todayPlan.version)}</strong>
      </div>
      <div className="hero-meta-item">
        <span className="hero-meta-label">예상 시간</span>
        <strong>{plannerOutput.todayPlan.estimatedMinutes}분</strong>
      </div>
      <div className="hero-meta-item">
        <span className="hero-meta-label">운동 밀도</span>
        <strong>{plannerOutput.todayPlan.densityLabel}</strong>
      </div>
      <div className="hero-meta-item">
        <span className="hero-meta-label">첫 동작</span>
        <strong>{plannerOutput.todayPlan.exercises[0]?.name ?? "회복 걷기"}</strong>
      </div>
    </div>

    <div className="hero-exercise-box">
      <div className="hero-exercise-title">오늘 바로 할 블록 요약</div>
      <ul className="hero-list">
        {plannerOutput.todayPlan.blocks.slice(0, 5).map((block) => (
          <li key={block.id}>
            <strong>{block.title}</strong>
            <span>
              {block.estimatedMinutes}분 · {block.exercises[0]?.name}
            </span>
          </li>
        ))}
      </ul>
    </div>

    <button className="primary-button primary-button-wide" onClick={onStart} type="button">
      오늘 세션 열기
    </button>
  </section>
);
