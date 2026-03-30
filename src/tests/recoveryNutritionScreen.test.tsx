import { fireEvent, render, screen } from "@testing-library/react";
import { RecoveryNutritionScreen } from "../screens/recovery-nutrition/RecoveryNutritionScreen";

describe("RecoveryNutritionScreen", () => {
  it("회복 입력값을 저장한다", () => {
    const handleSave = vi.fn();

    render(
      <RecoveryNutritionScreen
        date="2026-03-29"
        onSave={handleSave}
        recommendedVersion="reduced"
      />
    );

    expect(
      screen.getByText(
        (_, element) =>
          Boolean(
            element?.classList.contains("recovery-summary") &&
              element.textContent?.includes("입력 기준일: 2026-03-29")
          )
      )
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("피로도 (1~10)"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("상체 DOMS (1~10)"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("하체 DOMS (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("어깨·견갑 부담 (1~10)"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("수면시간"), { target: { value: "6.5" } });
    fireEvent.change(screen.getByLabelText("메모"), { target: { value: "상체만 무거움" } });
    fireEvent.click(screen.getByRole("button", { name: "현재 기준 회복 입력 저장" }));

    expect(handleSave).toHaveBeenCalledWith({
      fatigue: 6,
      upperDoms: 7,
      lowerDoms: 5,
      shoulderStress: 6,
      sleepHours: 6.5,
      memo: "상체만 무거움"
    });
    expect(screen.getByText("2026-03-29 회복 입력이 저장되었습니다.")).toBeInTheDocument();
  });
});
