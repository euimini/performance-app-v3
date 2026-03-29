import { fireEvent, render, screen } from "@testing-library/react";
import { RecoveryNutritionScreen } from "../screens/recovery-nutrition/RecoveryNutritionScreen";

describe("RecoveryNutritionScreen", () => {
  it("saves the expanded recovery inputs", () => {
    const handleSave = vi.fn();

    render(
      <RecoveryNutritionScreen
        date="2026-03-29"
        onSave={handleSave}
        recommendedVersion="reduced"
        recoveryHistory={[]}
      />
    );

    fireEvent.change(screen.getByLabelText("피로도 (1~10)"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("상체 DOMS (1~10)"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("하체 DOMS (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("어깨·팔꿈치 부담 (1~10)"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("수면시간"), { target: { value: "6.5" } });
    fireEvent.change(screen.getByLabelText("메모"), { target: { value: "상체만 무거움" } });
    fireEvent.click(screen.getByRole("button", { name: "오늘 회복 기록 저장" }));

    expect(handleSave).toHaveBeenCalledWith({
      fatigue: 6,
      upperDoms: 7,
      lowerDoms: 5,
      shoulderStress: 6,
      sleepHours: 6.5,
      memo: "상체만 무거움"
    });
    expect(screen.getByText("오늘 회복 기록이 저장되었습니다.")).toBeInTheDocument();
  });
});
