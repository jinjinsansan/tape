export const POINT_ACTION_LABELS: Record<string, { label: string; hint: string }> = {
  diary_post: { label: "日記投稿", hint: "日記を1件投稿するごと" },
  feed_comment: { label: "コメント", hint: "みんなの日記にコメントするごと" },
  feed_share_x: { label: "Xシェア", hint: "みんなの日記をXでシェアするごと" },
  referral_5days: { label: "紹介特典(5日)", hint: "紹介したユーザーが5日継続" },
  referral_10days: { label: "紹介特典(10日)", hint: "紹介したユーザーが10日継続" },
  admin_adjustment: { label: "管理者調整", hint: "管理者が手動でポイントを付与" }
};

export const getPointActionInfo = (action: string) => POINT_ACTION_LABELS[action] ?? { label: action, hint: "" };
