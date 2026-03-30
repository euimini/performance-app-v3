import { HomeHeroCard } from "../../components/cards/HomeHeroCard";
import { WeeklyPlanCard } from "../../components/cards/WeeklyPlanCard";
import type { PlannerOutput, WeeklyPlannerOutput } from "../../domain/session/types";

type HomeScreenProps = {
  plannerOutput: PlannerOutput;
  weeklyPlan: WeeklyPlannerOutput;
  onStart: () => void;
};

export const HomeScreen = ({ plannerOutput, weeklyPlan, onStart }: HomeScreenProps) => (
  <div className="screen-stack">
    <HomeHeroCard plannerOutput={plannerOutput} onStart={onStart} />

    <section className="panel-card">
      <div className="eyebrow">앞으로 6일 루틴</div>
      <h2>{weeklyPlan.weekLabel}</h2>
      <p>현재 진행 기준일에 맞춰 앞으로 이어질 6일 처방만 바로 보여줍니다.</p>
      <div className="weekly-grid">
        {weeklyPlan.items.map((item) => (
          <WeeklyPlanCard item={item} key={item.date} />
        ))}
      </div>
    </section>

    <section className="panel-card">
      <div className="eyebrow">오늘 처방 판단</div>
      <h2>상태 설명보다 지금 기준으로 해야 할 루틴이 먼저 보이도록 정리했습니다.</h2>
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

    {plannerOutput.todayPlan.pullUpMeta ? (
      <section className="panel-card">
        <div className="eyebrow">턱걸이 성장 트랙</div>
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
        <div className="eyebrow">소방 종목 대응</div>
        <h2>현재 세션을 실제 종목 흐름에 맞는 대체 동작으로 연결해 둡니다.</h2>
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
