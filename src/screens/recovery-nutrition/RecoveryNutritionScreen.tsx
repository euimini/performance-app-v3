import { useEffect, useMemo, useState } from "react";
import type { RecoveryState } from "../../domain/recovery/RecoveryState";
import type { SessionVersion } from "../../domain/session/types";

type RecoveryNutritionScreenProps = {
  date: string;
  recoveryState?: RecoveryState;
  recoveryHistory: RecoveryState[];
  recommendedVersion: SessionVersion;
  onSave: (payload: {
    fatigue: number;
    upperDoms: number;
    lowerDoms: number;
    shoulderStress: number;
    sleepHours: number;
    memo?: string;
  }) => void;
};

const presets = [
  {
    label: "무난함",
    fatigue: 4,
    upperDoms: 3,
    lowerDoms: 3,
    shoulderStress: 3,
    sleepHours: 7,
    memo: "기본 처방 진행 가능"
  },
  {
    label: "상체 무거움",
    fatigue: 6,
    upperDoms: 7,
    lowerDoms: 4,
    shoulderStress: 7,
    sleepHours: 6,
    memo: "풀업 또는 푸시 볼륨 줄이기"
  },
  {
    label: "하체 무거움",
    fatigue: 6,
    upperDoms: 4,
    lowerDoms: 7,
    shoulderStress: 4,
    sleepHours: 6,
    memo: "하체 및 소방 서킷 축소"
  },
  {
    label: "회복 우선",
    fatigue: 9,
    upperDoms: 8,
    lowerDoms: 8,
    shoulderStress: 8,
    sleepHours: 5,
    memo: "회복 카드로 내려야 함"
  }
] as const;

const versionLabel = (version: SessionVersion) =>
  version === "normal" ? "기본 처방" : version === "reduced" ? "축소 처방" : "회복 처방";

const buildNutritionTips = (recoveryState?: RecoveryState) => {
  if (!recoveryState) {
    return [
      "회복 입력이 없으면 보수적으로 해석합니다.",
      "풀업과 소방 서킷 우선 앱이므로 상체/하체 DOMS를 분리해 적어야 처방이 정확해집니다.",
      "수면이 부족한 날은 먼저 물과 식사를 챙기고 볼륨을 줄입니다."
    ];
  }

  if (recoveryState.fatigue >= 8 || recoveryState.sleepHours < 6) {
    return [
      "오늘은 탄수화물과 수분을 먼저 챙기고, 단백질은 한 끼에 몰지 말고 나눠 먹는 쪽이 낫습니다.",
      "속이 불편하면 무리한 고섬유질보다 소화 쉬운 식사를 우선합니다.",
      "카페인으로 억지 각성하기보다 취침 시간을 당기는 편이 다음 처방에 더 직접적입니다."
    ];
  }

  if (recoveryState.upperDoms >= 7 || recoveryState.lowerDoms >= 7) {
    return [
      "DOMS가 강한 부위가 있으면 운동 전후로 물과 식사를 비우지 않는 게 우선입니다.",
      "당일 단백질 섭취를 놓치지 말고, 소화가 쉬운 탄수화물을 같이 붙입니다.",
      "회복일에는 영양을 줄이는 날이 아니라 다시 훈련 흐름으로 들어갈 준비를 하는 날입니다."
    ];
  }

  return [
    "기본 처방이 가능한 날도 수분과 단백질을 빼먹지 않는 것이 다음 소방 서킷과 풀업 성장에 더 중요합니다.",
    "운동 전 공복이 길다면 작은 탄수화물 간식으로 힘 빠짐을 줄일 수 있습니다.",
    "수면이 7시간 이상 유지되면 축소 처방으로 떨어질 확률이 줄어듭니다."
  ];
};

export const RecoveryNutritionScreen = ({
  date,
  recoveryState,
  recoveryHistory,
  recommendedVersion,
  onSave
}: RecoveryNutritionScreenProps) => {
  const todayRecovery = recoveryHistory.find((entry) => entry.date === date);
  const [fatigue, setFatigue] = useState(todayRecovery ? String(todayRecovery.fatigue) : "");
  const [upperDoms, setUpperDoms] = useState(todayRecovery ? String(todayRecovery.upperDoms) : "");
  const [lowerDoms, setLowerDoms] = useState(todayRecovery ? String(todayRecovery.lowerDoms) : "");
  const [shoulderStress, setShoulderStress] = useState(
    todayRecovery ? String(todayRecovery.shoulderStress) : ""
  );
  const [sleepHours, setSleepHours] = useState(todayRecovery ? String(todayRecovery.sleepHours) : "");
  const [memo, setMemo] = useState(todayRecovery?.memo ?? "");
  const [statusMessage, setStatusMessage] = useState("");

  const nutritionTips = useMemo(() => buildNutritionTips(recoveryState), [recoveryState]);

  useEffect(() => {
    setFatigue(todayRecovery ? String(todayRecovery.fatigue) : "");
    setUpperDoms(todayRecovery ? String(todayRecovery.upperDoms) : "");
    setLowerDoms(todayRecovery ? String(todayRecovery.lowerDoms) : "");
    setShoulderStress(todayRecovery ? String(todayRecovery.shoulderStress) : "");
    setSleepHours(todayRecovery ? String(todayRecovery.sleepHours) : "");
    setMemo(todayRecovery?.memo ?? "");
  }, [todayRecovery]);

  const applyPreset = (preset: (typeof presets)[number]) => {
    setFatigue(String(preset.fatigue));
    setUpperDoms(String(preset.upperDoms));
    setLowerDoms(String(preset.lowerDoms));
    setShoulderStress(String(preset.shoulderStress));
    setSleepHours(String(preset.sleepHours));
    setMemo(preset.memo);
    setStatusMessage("");
  };

  const handleSave = () => {
    if (!fatigue || !upperDoms || !lowerDoms || !shoulderStress || !sleepHours) {
      setStatusMessage("피로도, 상체 DOMS, 하체 DOMS, 어깨 부담, 수면시간을 모두 입력해야 저장됩니다.");
      return;
    }

    onSave({
      fatigue: Number(fatigue),
      upperDoms: Number(upperDoms),
      lowerDoms: Number(lowerDoms),
      shoulderStress: Number(shoulderStress),
      sleepHours: Number(sleepHours),
      memo: memo.trim() || undefined
    });
    setStatusMessage("오늘 회복 기록이 저장되었습니다.");
  };

  return (
    <div className="screen-stack">
      <section className="panel-card">
        <div className="eyebrow">회복 입력</div>
        <h2>오늘 컨디션을 적으면 처방 엔진이 강도를 다시 계산합니다.</h2>
        <p className="recovery-summary">
          현재 추천 버전: <strong>{versionLabel(recommendedVersion)}</strong>
        </p>

        <div className="panel-grid">
          <article className="info-card">
            <span className="hero-meta-label">오늘 회복 상태</span>
            <strong>
              피로 {recoveryState?.fatigue ?? "-"} / 상체 {recoveryState?.upperDoms ?? "-"} / 하체{" "}
              {recoveryState?.lowerDoms ?? "-"}
            </strong>
            <p>어깨·팔꿈치 부담 {recoveryState?.shoulderStress ?? "-"} / 수면 {recoveryState?.sleepHours ?? "-"}시간</p>
          </article>
          <article className="info-card">
            <span className="hero-meta-label">입력 이유</span>
            <strong>소방 서킷과 풀업은 상·하체를 따로 봐야 정확합니다.</strong>
            <p>상체가 무겁다고 하체 세션까지 막을 필요는 없고, 반대도 마찬가지입니다.</p>
          </article>
        </div>
      </section>

      <section className="panel-card">
        <div className="eyebrow">빠른 선택</div>
        <h2>프리셋으로 채운 뒤 필요한 값만 수정할 수 있습니다.</h2>
        <div className="quick-actions">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => applyPreset(preset)} type="button">
              {preset.label}
            </button>
          ))}
        </div>

        <div className="recovery-form-grid">
          <label className="recovery-field">
            <span>피로도 (1~10)</span>
            <input min="1" max="10" type="number" value={fatigue} onChange={(event) => setFatigue(event.target.value)} />
          </label>
          <label className="recovery-field">
            <span>상체 DOMS (1~10)</span>
            <input
              min="1"
              max="10"
              type="number"
              value={upperDoms}
              onChange={(event) => setUpperDoms(event.target.value)}
            />
          </label>
          <label className="recovery-field">
            <span>하체 DOMS (1~10)</span>
            <input
              min="1"
              max="10"
              type="number"
              value={lowerDoms}
              onChange={(event) => setLowerDoms(event.target.value)}
            />
          </label>
          <label className="recovery-field">
            <span>어깨·팔꿈치 부담 (1~10)</span>
            <input
              min="1"
              max="10"
              type="number"
              value={shoulderStress}
              onChange={(event) => setShoulderStress(event.target.value)}
            />
          </label>
          <label className="recovery-field">
            <span>수면시간</span>
            <input
              min="0"
              max="12"
              step="0.5"
              type="number"
              value={sleepHours}
              onChange={(event) => setSleepHours(event.target.value)}
            />
          </label>
        </div>

        <label className="recovery-field recovery-field-wide">
          <span>메모</span>
          <textarea
            rows={3}
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="예: 상체는 무겁지만 하체는 괜찮음, 어깨 뻐근함, 잠 설침"
          />
        </label>

        <button className="primary-button" onClick={handleSave} type="button">
          오늘 회복 기록 저장
        </button>
        {statusMessage ? <p className="recovery-status">{statusMessage}</p> : null}
      </section>

      <section className="panel-card">
        <div className="eyebrow">최근 회복 흐름</div>
        <h2>원시 기록은 로컬에만 저장되고, 처방 엔진은 여기 값을 읽어 강도를 계산합니다.</h2>
        <div className="recovery-history-grid">
          {recoveryHistory.length > 0 ? (
            recoveryHistory.map((entry) => (
              <article className="info-card" key={entry.date}>
                <span className="hero-meta-label">{entry.date}</span>
                <strong>
                  피로 {entry.fatigue} / 상체 {entry.upperDoms} / 하체 {entry.lowerDoms}
                </strong>
                <p>어깨 {entry.shoulderStress} / 수면 {entry.sleepHours}시간</p>
                <p>{entry.memo ?? "메모 없음"}</p>
              </article>
            ))
          ) : (
            <article className="info-card">
              <span className="hero-meta-label">기록 없음</span>
              <strong>아직 저장된 회복 기록이 없습니다.</strong>
              <p>오늘 상태를 적으면 내일 처방부터 바로 영향을 받습니다.</p>
            </article>
          )}
        </div>

        <div className="nutrition-card">
          <div className="eyebrow">회복 · 영양 가이드</div>
          <ul className="mini-list">
            {nutritionTips.map((tip) => (
              <li key={tip}>
                <strong>가이드</strong>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
