import { useState } from "react";

type CalendarDay = {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  completed: boolean;
};

type RecordsScreenProps = {
  calendarDays: CalendarDay[];
  onToggleComplete: (date: string) => void;
  onResetToday: () => void;
};

export const RecordsScreen = ({
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
    <section className="panel-card">
      <div className="eyebrow">기록</div>
      <h2>처방 완료 여부만 간단히 확인합니다.</h2>

      <div className="record-actions">
        <button
          className={confirmReset ? "danger-button" : "secondary-button"}
          onClick={handleResetClick}
          type="button"
        >
          {confirmReset ? "한 번 더 누르면 오늘 기록 초기화" : "오늘 기록 초기화"}
        </button>
        {confirmReset ? (
          <p className="record-help">오늘 회복 입력, 완료 체크, 진행 중 세션 상태를 함께 지웁니다.</p>
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
    </section>
  );
};
