import { useState } from "react";
import type { SessionLog } from "../../domain/records/SessionLog";

type CalendarDay = {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  completed: boolean;
};

type RecordsScreenProps = {
  sessionLogs: SessionLog[];
  calendarDays: CalendarDay[];
  onToggleComplete: (date: string) => void;
  onResetToday: () => void;
};

export const RecordsScreen = ({
  sessionLogs,
  calendarDays,
  onToggleComplete,
  onResetToday
}: RecordsScreenProps) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }

    onResetToday();
    setConfirmReset(false);
  };

  return (
    <section className="quick-log-card">
      <div className="eyebrow">기록</div>
      <h2>달력에서 운동 완료를 바로 체크합니다.</h2>

      <div className="record-actions">
        <button
          className={confirmReset ? "danger-button" : "secondary-button"}
          onClick={handleResetClick}
          type="button"
        >
          {confirmReset ? "한 번 더 누르면 오늘 기록 초기화" : "오늘 기록 초기화"}
        </button>
        {confirmReset ? (
          <p className="record-help">오늘 회복 기록, 완료 체크, 진행 중 세션을 함께 지웁니다.</p>
        ) : null}
      </div>

      <div className="calendar-grid">
        {calendarDays.map((day) => (
          <button
            key={day.date}
            className={
              day.completed
                ? "calendar-day done"
                : day.inMonth
                  ? "calendar-day"
                  : "calendar-day muted"
            }
            onClick={() => day.inMonth && onToggleComplete(day.date)}
            type="button"
          >
            <span>{day.dayNumber}</span>
            <small>{day.completed ? "완료" : "미완료"}</small>
          </button>
        ))}
      </div>

      <ul className="record-list">
        {sessionLogs.map((log) => (
          <li key={`${log.date}-${log.sessionTemplateId}`}>
            {log.date} · {log.sessionTemplateId} · {log.completed ? "완료" : "미완료"} · {log.intensity}
          </li>
        ))}
      </ul>
    </section>
  );
};
