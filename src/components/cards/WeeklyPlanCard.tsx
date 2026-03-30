import type { WeeklyPlanItem } from "../../domain/session/types";

type WeeklyPlanCardProps = {
  item: WeeklyPlanItem;
};

const statusLabel = (status: WeeklyPlanItem["status"]) =>
  status === "completed" ? "완료" : status === "missed" ? "미수행" : status === "today" ? "현재" : "예정";

const typeLabel = (type: WeeklyPlanItem["sessionType"]) =>
  type === "normal" ? "기본" : type === "reduced" ? "축소" : type === "recovery" ? "회복" : "휴식";

export const WeeklyPlanCard = ({ item }: WeeklyPlanCardProps) => (
  <article
    aria-label={`주간 루틴 ${item.date}`}
    className={
      item.isToday
        ? "weekly-card weekly-card-today"
        : item.status === "completed"
          ? "weekly-card weekly-card-completed"
          : item.status === "missed"
            ? "weekly-card weekly-card-missed"
            : "weekly-card"
    }
  >
    <div className="weekly-card-top">
      <div>
        <div className="eyebrow">{item.dayLabel}</div>
        <h3>{item.sessionTitle}</h3>
      </div>
      <div className="weekly-badge-stack">
        <span className="weekly-badge">{statusLabel(item.status)}</span>
        <span className="weekly-badge subtle">{typeLabel(item.sessionType)}</span>
      </div>
    </div>

    <p>{item.summary}</p>

    <div className="weekly-meta">
      <span>{item.estimatedMinutes}분</span>
      <span>{item.densityLabel}</span>
    </div>

    <div className="weekly-tag-row">
      {item.focusTags.map((tag) => (
        <span className="weekly-tag" key={tag}>
          {tag}
        </span>
      ))}
    </div>

    <ul className="weekly-key-list">
      {item.keyExercises.map((exercise) => (
        <li key={exercise}>{exercise}</li>
      ))}
    </ul>

    {item.rescheduledFrom ? (
      <div className="weekly-warning-row">
        <span className="warning-pill">미수행 재배치 {item.rescheduledFrom}</span>
      </div>
    ) : null}

    {item.warnings.length > 0 ? (
      <div className="weekly-warning-row">
        {item.warnings.map((warning) => (
          <span className="warning-pill" key={warning}>
            {warning}
          </span>
        ))}
      </div>
    ) : null}
  </article>
);
