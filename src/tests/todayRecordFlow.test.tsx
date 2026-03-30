import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { addDays, getTodayLocalDate, parseLocalDate } from "../services/localDate";

const RAW_LOGS_KEY = "performance-app-v3/raw-logs";

const completeAllExercises = () => {
  screen.getAllByRole("button", { name: "이 동작 끝내기" }).forEach((button) => {
    fireEvent.click(button);
  });
};

const getStoredRawLogs = () => {
  const saved = window.localStorage.getItem(RAW_LOGS_KEY);
  return saved ? (JSON.parse(saved) as { recoveryLogs: Array<{ date: string }>; sessionLogs: Array<{ date: string }> }) : null;
};

describe("Today record flow", () => {
  const today = getTodayLocalDate();
  const tomorrow = addDays(today, 1);
  const todayDay = parseLocalDate(today).getDate();

  it("초기 홈 헤더는 today부터 6일 범위로 시작한다", () => {
    window.localStorage.clear();

    render(<App />);

    expect(screen.getByText(`${today} ~ ${addDays(today, 5)}`)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/주간 루틴 2026-/).length).toBe(6);
    expect(within(screen.getByLabelText(`주간 루틴 ${today}`)).getByText("현재")).toBeInTheDocument();
  });

  it("오늘 세션 화면에는 현재 planner 기준 날짜가 표시된다", () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));

    expect(screen.getByText(`현재 진행 날짜 ${today}`)).toBeInTheDocument();
  });

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

  it("오늘 세션 완료 후 오늘 세션 화면 상단 날짜도 즉시 다음 날로 바뀐다", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    expect(screen.getByText(`현재 진행 날짜 ${today}`)).toBeInTheDocument();

    completeAllExercises();

    await waitFor(() =>
      expect(screen.getByText(`현재 진행 날짜 ${tomorrow}`)).toBeInTheDocument()
    );
  });

  it("active day가 다음 날로 넘어간 뒤 회복 입력 화면도 같은 기준일을 사용한다", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    completeAllExercises();

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          (_, element) =>
            Boolean(
              element?.classList.contains("recovery-summary") &&
                element.textContent?.includes(`입력 기준일: ${tomorrow}`)
            )
        )
      ).toBeInTheDocument()
    );

    expect(screen.getByRole("button", { name: "현재 기준 회복 입력 저장" })).toBeInTheDocument();
  });

  it("active day 기준으로 회복 입력을 저장하면 홈과 저장값이 즉시 같은 날짜를 반영한다", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    completeAllExercises();

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));
    fireEvent.change(screen.getByLabelText("피로도 (1~10)"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("상체 DOMS (1~10)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("하체 DOMS (1~10)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("어깨·견갑 부담 (1~10)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("수면시간"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "현재 기준 회복 입력 저장" }));

    await waitFor(() =>
      expect(screen.getByText(`${tomorrow} 회복 입력이 저장되었습니다.`)).toBeInTheDocument()
    );

    const storedRawLogs = getStoredRawLogs();
    expect(storedRawLogs?.recoveryLogs.some((entry) => entry.date === tomorrow)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "홈" }));

    await waitFor(() =>
      expect(within(screen.getByLabelText(`주간 루틴 ${tomorrow}`)).getAllByText("회복").length).toBeGreaterThan(0)
    );
  });

  it("현재 기준 기록 초기화는 activeDate 기준 회복 입력과 기록만 지운다", async () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    completeAllExercises();

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));
    fireEvent.change(screen.getByLabelText("피로도 (1~10)"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("상체 DOMS (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("하체 DOMS (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("어깨·견갑 부담 (1~10)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("수면시간"), { target: { value: "6.5" } });
    fireEvent.click(screen.getByRole("button", { name: "현재 기준 회복 입력 저장" }));

    fireEvent.click(screen.getByRole("button", { name: "기록" }));
    fireEvent.click(screen.getByRole("button", { name: "현재 기준 기록 초기화" }));
    fireEvent.click(screen.getByRole("button", { name: "한 번 더 누르면 현재 기준 기록 초기화" }));

    await waitFor(() => {
      const storedRawLogs = getStoredRawLogs();
      expect(storedRawLogs?.recoveryLogs.some((entry) => entry.date === tomorrow)).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "회복 입력" }));
    expect(
      screen.getByText(
        (_, element) =>
          Boolean(
            element?.classList.contains("recovery-summary") &&
              element.textContent?.includes(`입력 기준일: ${tomorrow}`)
          )
      )
    ).toBeInTheDocument();
    expect(screen.getByText("현재 기준일 몸 상태를 빠르게 적고 바로 저장합니다.")).toBeInTheDocument();
  });
});
