import { HomeHeroCard } from "../../components/cards/HomeHeroCard";
import { WeeklyPlanCard } from "../../components/cards/WeeklyPlanCard";
import type { PlannerOutput, SessionDraft, WeeklyPlannerOutput } from "../../domain/session/types";

type HomeScreenProps = {
  plannerOutput: PlannerOutput;
  weeklyPlan: WeeklyPlannerOutput;
  draft?: SessionDraft;
  onStart: () => void;
};

const versionLabel = (version: PlannerOutput["fallbackPlan"]["version"]) =>
  version === "normal" ? "기본 재진입" : version === "reduced" ? "축소 재진입" : "회복 전환";

export const HomeScreen = ({ plannerOutput, weeklyPlan, onStart }: HomeScreenProps) => (
  <div className="screen-stack">
    <HomeHeroCard plannerOutput={plannerOutput} onStart={onStart} />

    <section className="panel-card">
      <div className="eyebrow">이번 주 7일 루틴</div>
      <h2>{weeklyPlan.weekLabel}</h2>
      <p>오늘 처방과 같은 엔진에서 계산한 이번 주 흐름입니다.</p>
      <div className="weekly-grid">
        {weeklyPlan.items.map((item) => (
          <WeeklyPlanCard item={item} key={item.date} />
        ))}
      </div>
    </section>

    <section className="panel-card">
      <div className="eyebrow">왜 이 처방인가</div>
      <h2>오늘은 상태 해석보다 행동 가능한 세션이 먼저 나옵니다.</h2>
      <ul className="decision-list">
        {plannerOutput.selectedReason.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      {plannerOutput.warnings.length > 0 ? (
        <div className="warning-stack">
          {plannerOutput.warnings.map((warning) => (
            <div className="warning-pill" key={warning}>
              {warning}
            </div>
          ))}
        </div>
      ) : null}
    </section>

    <section className="panel-grid">
      <article className="panel-card compact-card">
        <div className="eyebrow">대체 처방</div>
        <h3>{plannerOutput.fallbackPlan.title}</h3>
        <p>{plannerOutput.fallbackPlan.summary}</p>
        <div className="mini-label">{versionLabel(plannerOutput.fallbackPlan.version)}</div>
        <div className="weekly-meta">
          <span>{plannerOutput.fallbackPlan.estimatedMinutes}분</span>
          <span>{plannerOutput.fallbackPlan.densityLabel}</span>
        </div>
        <ul className="mini-list">
          {plannerOutput.fallbackPlan.exercises.slice(0, 4).map((exercise) => (
            <li key={exercise.id}>
              <strong>{exercise.name}</strong>
              <span>{exercise.prescription}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel-card compact-card">
        <div className="eyebrow">다음 흐름</div>
        <h3>주간 처방과 모순되지 않는 다음 세 단계입니다.</h3>
        <ul className="flow-list">
          {plannerOutput.nextFlow.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.title}</span>
              <small>{item.focus}</small>
            </li>
          ))}
        </ul>
      </article>
    </section>

    {plannerOutput.todayPlan.pullUpMeta ? (
      <section className="panel-card">
        <div className="eyebrow">풀업 성장 트랙</div>
        <h2>{plannerOutput.todayPlan.pullUpMeta.trackLabel}</h2>
        <div className="panel-grid">
          <article className="info-card">
            <span className="hero-meta-label">현재 단계</span>
            <strong>{plannerOutput.todayPlan.pullUpMeta.currentTier}</strong>
            <p>{plannerOutput.todayPlan.pullUpMeta.progressionRule}</p>
          </article>
          <article className="info-card">
            <span className="hero-meta-label">품질 기준</span>
            <strong>{plannerOutput.todayPlan.pullUpMeta.qualityGate}</strong>
            <p>{plannerOutput.todayPlan.pullUpMeta.readinessAdjustment}</p>
          </article>
        </div>
      </section>
    ) : null}

    {plannerOutput.todayPlan.firefighterStations ? (
      <section className="panel-card">
        <div className="eyebrow">시험 종목 대응</div>
        <h2>소방 서킷 Day는 실제 평가 종목에 맞는 대체 동작으로 보여줍니다.</h2>
        <div className="station-grid">
          {plannerOutput.todayPlan.firefighterStations.map((station) => (
            <article className="station-card" key={station.stationName}>
              <div className="mini-label">{station.testLabel}</div>
              <strong>{station.movementLabel}</strong>
              <p>{station.prescription}</p>
              <span>{station.rest}</span>
            </article>
          ))}
        </div>
      </section>
    ) : null}
  </div>
);
