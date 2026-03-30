import { useEffect, useState } from "react";
import type { RecoveryState } from "../../domain/recovery/RecoveryState";
import type { SessionVersion } from "../../domain/session/types";

type RecoveryNutritionScreenProps = {
  date: string;
  recoveryState?: RecoveryState;
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
    memo: "당기기와 밀기 볼륨 줄이기"
  },
  {
    label: "하체 무거움",
    fatigue: 6,
    upperDoms: 4,
    lowerDoms: 7,
    shoulderStress: 4,
    sleepHours: 6,
    memo: "하체와 소방 순환 볼륨 줄이기"
  },
  {
    label: "회복 우선",
    fatigue: 9,
    upperDoms: 8,
    lowerDoms: 8,
    shoulderStress: 8,
    sleepHours: 5,
    memo: "회복 처방으로 낮춰서 진행"
  }
] as const;

const versionLabel = (version: SessionVersion) =>
  version === "normal" ? "기본 처방" : version === "reduced" ? "축소 처방" : "회복 처방";

export const RecoveryNutritionScreen = ({
  date,
  recoveryState,
  recommendedVersion,
  onSave
}: RecoveryNutritionScreenProps) => {
  const todayRecovery = recoveryState?.date === date ? recoveryState : undefined;
  const [fatigue, setFatigue] = useState(todayRecovery ? String(todayRecovery.fatigue) : "");
  const [upperDoms, setUpperDoms] = useState(todayRecovery ? String(todayRecovery.upperDoms) : "");
  const [lowerDoms, setLowerDoms] = useState(todayRecovery ? String(todayRecovery.lowerDoms) : "");
  const [shoulderStress, setShoulderStress] = useState(
    todayRecovery ? String(todayRecovery.shoulderStress) : ""
  );
  const [sleepHours, setSleepHours] = useState(todayRecovery ? String(todayRecovery.sleepHours) : "");
  const [memo, setMemo] = useState(todayRecovery?.memo ?? "");
  const [statusMessage, setStatusMessage] = useState("");

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
      setStatusMessage("피로도, 상체 DOMS, 하체 DOMS, 어깨 부담, 수면시간을 모두 입력해 주세요.");
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
    setStatusMessage(`${date} 회복 입력이 저장되었습니다.`);
  };

  return (
    <section className="panel-card">
      <div className="eyebrow">회복 입력</div>
      <h2>현재 기준일 몸 상태를 빠르게 적고 바로 저장합니다.</h2>
      <p className="recovery-summary">
        입력 기준일: <strong>{date}</strong> · 현재 추천 버전: <strong>{versionLabel(recommendedVersion)}</strong>
      </p>

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
          <input max="10" min="1" onChange={(event) => setFatigue(event.target.value)} type="number" value={fatigue} />
        </label>
        <label className="recovery-field">
          <span>상체 DOMS (1~10)</span>
          <input
            max="10"
            min="1"
            onChange={(event) => setUpperDoms(event.target.value)}
            type="number"
            value={upperDoms}
          />
        </label>
        <label className="recovery-field">
          <span>하체 DOMS (1~10)</span>
          <input
            max="10"
            min="1"
            onChange={(event) => setLowerDoms(event.target.value)}
            type="number"
            value={lowerDoms}
          />
        </label>
        <label className="recovery-field">
          <span>어깨·견갑 부담 (1~10)</span>
          <input
            max="10"
            min="1"
            onChange={(event) => setShoulderStress(event.target.value)}
            type="number"
            value={shoulderStress}
          />
        </label>
        <label className="recovery-field">
          <span>수면시간</span>
          <input
            max="12"
            min="0"
            onChange={(event) => setSleepHours(event.target.value)}
            step="0.5"
            type="number"
            value={sleepHours}
          />
        </label>
      </div>

      <label className="recovery-field recovery-field-wide">
        <span>메모</span>
        <textarea
          onChange={(event) => setMemo(event.target.value)}
          placeholder="예: 상체만 무겁고 하체는 괜찮음, 어깨가 뻐근함"
          rows={3}
          value={memo}
        />
      </label>

      <button className="primary-button" onClick={handleSave} type="button">
        현재 기준 회복 입력 저장
      </button>
      {statusMessage ? <p className="recovery-status">{statusMessage}</p> : null}
    </section>
  );
};
