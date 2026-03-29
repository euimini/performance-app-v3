import { fireEvent, render, screen } from "@testing-library/react";
import App from "../App";

describe("TodaySession reset", () => {
  it("resets the selected version and in-progress completion state", () => {
    window.localStorage.clear();

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "오늘 세션" }));
    fireEvent.click(screen.getByRole("button", { name: "회복" }));

    expect(screen.getByRole("heading", { level: 2, name: "회복 + 가동성 Day" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "이 동작 끝내기" })[0]);
    expect(screen.getByRole("button", { name: "완료됨" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "오늘 루틴 초기화" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "소방 서킷 + 왕복오래달리기 대비 Day" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "완료됨" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "이 동작 끝내기" }).length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("performance-app-v3/session-draft")).toBeNull();
  });
});
