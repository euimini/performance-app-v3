export const parseLocalDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayLocalDate = (now = new Date()) => formatLocalDate(now);

export const addDays = (date: string, amount: number) => {
  const next = parseLocalDate(date);
  next.setDate(next.getDate() + amount);
  return formatLocalDate(next);
};

export const differenceInDays = (start: string, end: string) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((parseLocalDate(end).getTime() - parseLocalDate(start).getTime()) / oneDay);
};

export const startOfWeek = (date: string) => {
  const target = parseLocalDate(date);
  const day = target.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + offset);
  return formatLocalDate(target);
};

export const getMillisecondsUntilNextLocalDate = (now = new Date()) => {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    1,
    0
  );

  return Math.max(1000, nextMidnight.getTime() - now.getTime());
};
