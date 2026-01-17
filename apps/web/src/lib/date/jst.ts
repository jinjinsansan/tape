const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const jstFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export const getJstDateString = (date = new Date()): string => {
  const parts = jstFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
};

export const getTodayJstDate = () => getJstDateString(new Date());

export const addDaysToDateString = (dateString: string, deltaDays: number): string => {
  const date = new Date(`${dateString}T00:00:00+09:00`);
  const shifted = new Date(date.getTime() + deltaDays * DAY_MS);
  return getJstDateString(shifted);
};

export const getJstIsoNow = () => new Date(Date.now()).toISOString();

export const getStartOfJstDay = (date = new Date()): Date => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const jst = new Date(utc + JST_OFFSET_MS);
  jst.setUTCHours(0, 0, 0, 0);
  return new Date(jst.getTime() - JST_OFFSET_MS);
};
