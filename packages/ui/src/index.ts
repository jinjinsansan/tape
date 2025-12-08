export type TapeTheme = "light" | "dark";

export const defaultTheme: TapeTheme = "light";

export const applyTheme = (theme: TapeTheme = defaultTheme): void => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
};
