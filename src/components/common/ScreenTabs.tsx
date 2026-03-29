type ScreenKey = "home" | "today" | "recovery" | "records";

type ScreenTabsProps = {
  current: ScreenKey;
  onChange: (screen: ScreenKey) => void;
};

const tabs: Array<{ key: ScreenKey; label: string }> = [
  { key: "home", label: "처방 홈" },
  { key: "today", label: "오늘 세션" },
  { key: "recovery", label: "회복 입력" },
  { key: "records", label: "기록" }
];

export const ScreenTabs = ({ current, onChange }: ScreenTabsProps) => (
  <nav className="tab-bar" aria-label="화면 이동">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        className={current === tab.key ? "mode-button active" : "mode-button"}
        onClick={() => onChange(tab.key)}
        type="button"
      >
        {tab.label}
      </button>
    ))}
  </nav>
);
