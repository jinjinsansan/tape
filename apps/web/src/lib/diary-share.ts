import { SHARE_HASHTAG } from "@/lib/branding";

type DiaryShareTextInput = {
  title?: string | null;
  snippet: string;
  moodLabel?: string | null;
  feelings?: string[];
  journalDate?: string | null;
};

const SNIPPET_LIMIT = 90;

const normalizeSnippet = (value: string): string => {
  if (!value) return "";
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= SNIPPET_LIMIT) {
    return compact;
  }
  return `${compact.slice(0, SNIPPET_LIMIT)}…`;
};

const formatDiaryDate = (value?: string | null): string => {
  if (!value) return "今日の記録";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "今日の記録";
  }
  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日`;
};

export const buildDiaryShareText = ({
  title,
  snippet,
  moodLabel,
  feelings,
  journalDate
}: DiaryShareTextInput): string => {
  const sanitizedSnippet = normalizeSnippet(snippet);
  const dateLabel = formatDiaryDate(journalDate);
  const feelingLabels = (feelings ?? []).filter(Boolean);

  const lines: string[] = [
    `【かんじょうにっき ${dateLabel}】`
  ];

  if (title?.trim()) {
    lines.push(`「${title.trim()}」`);
  }

  if (moodLabel) {
    lines.push(`🪷 気分：${moodLabel}`);
  }

  if (feelingLabels.length > 0) {
    lines.push(`🎐 感情タグ：${feelingLabels.slice(0, 3).join(" / ")}`);
  }

  if (sanitizedSnippet) {
    lines.push(`📝 一言：${sanitizedSnippet}`);
  }

  lines.push("保存してまた読み返してください。", SHARE_HASHTAG);

  return lines.join("\n");
};
