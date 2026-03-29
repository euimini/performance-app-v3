import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../App";

describe("Today record flow", () => {
  it("automatically marks today complete when all prescribed exercises are finished", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    screen.getAllByRole("button", { name: "이 동작 끝내기" }).forEach((button) => {
      fireEvent.click(button);
    });

    await waitFor(() =>
      expect(screen.getByText("오늘 처방이 완료되어 기록에 자동 반영되었습니다.")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "기록" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /29 완료/ })).toBeInTheDocument());
  });

  it("today record reset clears both recovery inputs and completion state", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));
    fireEvent.change(screen.getByLabelText("피로도 (1~10)"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("상체 DOMS (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("하체 DOMS (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("어깨·팔꿈치 부담 (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("수면시간"), { target: { value: "6.5" } });
    fireEvent.click(screen.getByRole("button", { name: "오늘 회복 기록 저장" }));

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    screen.getAllByRole("button", { name: "이 동작 끝내기" }).forEach((button) => {
      fireEvent.click(button);
    });

    await waitFor(() =>
      expect(screen.getByText("오늘 처방이 완료되어 기록에 자동 반영되었습니다.")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "기록" }));
    fireEvent.click(screen.getByRole("button", { name: "오늘 기록 초기화" }));
    fireEvent.click(screen.getByRole("button", { name: "한 번 더 누르면 오늘 기록 초기화" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /29 미완료/ })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));
    expect(screen.getByText(/피로 - \/ 상체 - \/ 하체 -/)).toBeInTheDocument();
    expect(screen.getByText("아직 저장된 회복 기록이 없습니다.")).toBeInTheDocument();
  });

  it("stores a missed reason and shows it as missed in records", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    fireEvent.click(screen.getByRole("button", { name: "오늘 미수행 기록" }));

    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "미수행 사유 팝업" })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "피로" }));

    await waitFor(() =>
      expect(
        screen.getByText("오늘 미수행 사유를 피로(으)로 저장했습니다. 다음 처방 계산에 반영됩니다.")
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "기록" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /29 미수행/ })).toBeInTheDocument());
  });
});
