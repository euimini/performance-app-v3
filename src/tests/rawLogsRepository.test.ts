import { loadRawLogs, upsertRecoveryLog } from "../repositories/rawLogsRepository";

describe("rawLogsRepository", () => {
  it("keeps only one recovery log per date and overwrites with the latest value", () => {
    window.localStorage.setItem(
      "performance-app-v3/raw-logs",
      JSON.stringify({
        recoveryLogs: [
          { date: "2026-03-29", fatigue: 4, upperDoms: 3, lowerDoms: 3, shoulderStress: 3, sleepHours: 7, memo: "첫 기록" },
          { date: "2026-03-29", fatigue: 6, upperDoms: 5, lowerDoms: 5, shoulderStress: 5, sleepHours: 6, memo: "중복 기록" }
        ],
        sessionLogs: []
      })
    );

    const loaded = loadRawLogs();

    expect(loaded.recoveryLogs).toHaveLength(1);
    expect(loaded.recoveryLogs[0].memo).toBe("중복 기록");

    const updated = upsertRecoveryLog({
      date: "2026-03-29",
      fatigue: 8,
      upperDoms: 7,
      lowerDoms: 6,
      shoulderStress: 7,
      sleepHours: 5.5,
      memo: "최종 기록"
    });

    expect(updated.recoveryLogs).toHaveLength(1);
    expect(updated.recoveryLogs[0]).toMatchObject({
      date: "2026-03-29",
      fatigue: 8,
      upperDoms: 7,
      lowerDoms: 6,
      shoulderStress: 7,
      sleepHours: 5.5,
      memo: "최종 기록"
    });
  });
});
