import type { RecoveryState } from "../../domain/recovery/RecoveryState";

type RecoveryNutritionScreenProps = {
  recoveryState?: RecoveryState;
  onQuickUpdate: (fatigue: number, doms: number, sleepHours: number) => void;
};

export const RecoveryNutritionScreen = ({
  recoveryState,
  onQuickUpdate
}: RecoveryNutritionScreenProps) => (
  <section className="quick-log-card">
    <div className="eyebrow">회복·영양</div>
    <h2>오늘 강도 조정에 필요한 입력만 빠르게 남깁니다.</h2>
    <p>
      최근 기록: 피로 {recoveryState?.피로도 ?? "-"} / 근육통 {recoveryState?.근육통 ?? "-"} / 수면{" "}
      {recoveryState?.수면시간 ?? "-"}시간
    </p>
    <div className="quick-actions">
      <button onClick={() => onQuickUpdate(4, 3, 7)} type="button">
        몸 괜찮음
      </button>
      <button onClick={() => onQuickUpdate(7, 6, 6)} type="button">
        근육통 있음
      </button>
      <button onClick={() => onQuickUpdate(9, 8, 5)} type="button">
        회복 우선
      </button>
    </div>
  </section>
);
