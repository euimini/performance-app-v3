export const readStorage = <T>(key: string, fallback?: T): T | undefined => {
  const saved = window.localStorage.getItem(key);
  if (!saved) {
    return fallback;
  }

  return JSON.parse(saved) as T;
};

export const writeStorage = <T>(key: string, value: T) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const removeStorage = (key: string) => {
  window.localStorage.removeItem(key);
};
