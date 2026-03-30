import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { addDays, getTodayLocalDate, parseLocalDate } from "../services/localDate";

const completeAllExercises = () => {
  screen.getAllByRole("button", { name: "이 동작 끝내기" }).forEach((button) => {
    fireEvent.click(button);
  });
};

describe("Today record flow", () => {
  const today = getTodayLocalDate();
  const tomorrow = addDays(today, 1);
  const todayDay = parseLocalDate(today).getDate();

  it("모든 운동을 끝내면 오늘 완료 상태가 즉시 기록된다", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    completeAllExercises();

    fireEvent.click(screen.getByRole("button", { name: "기록" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: new RegExp(`${todayDay}\\s+완료`) })).toBeInTheDocument()
    );
  });

  it("오늘 기록 초기화는 회복 입력과 완료 상태를 함께 지운다", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));
    fireEvent.change(screen.getByLabelText("피로도 (1~10)"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("상체 DOMS (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("하체 DOMS (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("어깨·견갑 부담 (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("수면시간"), { target: { value: "6.5" } });
    fireEvent.click(screen.getByRole("button", { name: "오늘 회복 입력 저장" }));

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    completeAllExercises();

    fireEvent.click(screen.getByRole("button", { name: "기록" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: new RegExp(`${todayDay}\\s+완료`) })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "오늘 기록 초기화" }));
    fireEvent.click(screen.getByRole("button", { name: "한 번 더 누르면 오늘 기록 초기화" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: new RegExp(`${todayDay}\\s+미완료`) })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));
    expect(screen.getByText("오늘 몸 상태만 빠르게 적고 바로 저장합니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오늘 회복 입력 저장" })).toBeInTheDocument();
  });

  it("미수행 사유를 저장하면 기록 화면에 즉시 반영된다", async () => {
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
        screen.getByText("오늘 미수행 이유를 피로(으)로 저장했고, 다음 계산에 바로 반영했습니다.")
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "기록" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: new RegExp(`${todayDay}\\s+미수행`) })).toBeInTheDocument()
    );
  });

  it("회복 입력을 저장하면 새로고침 없이 현재 기준 6일 루틴이 다시 계산된다", async () => {
    window.localStorage.clear();

    render(<App />);

    expect(screen.getByText(`${today} ~ ${addDays(today, 5)}`)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/주간 루틴 2026-/).length).toBe(6);

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));
    fireEvent.change(screen.getByLabelText("피로도 (1~10)"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("상체 DOMS (1~10)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("하체 DOMS (1~10)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("어깨·견갑 부담 (1~10)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("수면시간"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "오늘 회복 입력 저장" }));

    fireEvent.click(screen.getByRole("button", { name: "홈" }));

    await waitFor(() =>
      expect(within(screen.getByLabelText(`주간 루틴 ${today}`)).getAllByText("회복").length).toBeGreaterThan(0)
    );
  });

  it("오늘 세션 완료 후 active day가 다음 날로 이동하면서 6일 범위가 한 칸 밀린다", async () => {
    window.localStorage.clear();

    render(<App />);

    expect(screen.getByText(`${today} ~ ${addDays(today, 5)}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    completeAllExercises();
    fireEvent.click(screen.getByRole("button", { name: "홈" }));

    await waitFor(() =>
      expect(screen.getByText(`${tomorrow} ~ ${addDays(tomorrow, 5)}`)).toBeInTheDocument()
    );

    expect(screen.getAllByLabelText(/주간 루틴 2026-/).length).toBe(6);
    expect(within(screen.getByLabelText(`주간 루틴 ${tomorrow}`)).getByText("현재")).toBeInTheDocument();
  });
});
