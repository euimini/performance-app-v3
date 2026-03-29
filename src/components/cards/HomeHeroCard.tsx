import type { PlannerOutput } from "../../domain/session/types";

type HomeHeroCardProps = {
  hero: PlannerOutput["hero"];
  onStart: () => void;
};

export const HomeHeroCard = ({ hero, onStart }: HomeHeroCardProps) => (
  <section className="hero-card hero-card-strong">
    <div className="eyebrow">오늘 세션</div>
    <h1>{hero.세션명}</h1>
    <p className="hero-purpose">{hero.목적}</p>
    <p className="hero-summary">{hero.요약문구}</p>

    <div className="hero-meta">
      <div className="hero-meta-item">
        <span className="hero-meta-label">운동 수</span>
        <strong>{hero.운동목록.length}개</strong>
      </div>
      <div className="hero-meta-item">
        <span className="hero-meta-label">바로 시작</span>
        <strong>{hero.운동목록[0]}</strong>
      </div>
    </div>

    <div className="hero-exercise-box">
      <div className="hero-exercise-title">운동 요약</div>
      <ul className="hero-list">
        {hero.운동목록.map((exercise) => (
          <li key={exercise}>{exercise}</li>
        ))}
      </ul>
    </div>

    <button className="primary-button primary-button-wide" onClick={onStart} type="button">
      {hero.시작버튼문구}
    </button>
  </section>
);
