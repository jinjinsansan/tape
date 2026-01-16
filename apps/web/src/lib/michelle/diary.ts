export const getDiaryEntryUrl = () => {
  const configured = process.env.NEXT_PUBLIC_DIARY_ENTRY_URL?.trim();
  if (configured) {
    return configured;
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (origin) {
    return `${origin}/diary`;
  }
  return "https://namisapo.app/diary";
};
