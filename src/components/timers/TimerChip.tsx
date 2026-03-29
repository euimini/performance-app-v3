type TimerChipProps = {
  seconds: number;
};

export const TimerChip = ({ seconds }: TimerChipProps) => (
  <span className="pill">타이머 {seconds}초</span>
);
