import { fireEvent, render, screen } from "@testing-library/react";
import App from "../App";

describe("TodaySession reset", () => {
  it("선택한 버전과 진행 중 완료 상태를 함께 초기화한다", () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    const initialTitle = screen.getByRole("heading", { level: 2 }).textContent ?? "";
    fireEvent.click(screen.getByRole("button", { name: "회복" }));

    expect(screen.getByRole("button", { name: "회복" })).toHaveClass("active");

    fireEvent.click(screen.getAllByRole("button", { name: "이 동작 끝내기" })[0]);
    expect(screen.getByRole("button", { name: "완료됨" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "오늘 루틴 초기화" }));

    expect(screen.getByRole("heading", { level: 2, name: initialTitle })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "완료됨" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "이 동작 끝내기" }).length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("performance-app-v3/session-draft")).toBeNull();
  });
});
