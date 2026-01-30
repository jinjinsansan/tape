import { getResendClient } from "@/lib/email";
import { isResendEnabled } from "@/lib/env";

const SENDER_EMAIL = "TAPE <no-reply@namisapo.app>";

const truncate = (value: string, length = 200) => {
  if (!value) return "";
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
  if (!isResendEnabled()) {
    console.warn("Resend is not enabled. Skipping email sending.");
    return;
  }

  const resend = getResendClient();
  if (!resend) return;

  try {
    const { error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html
    });

    if (error) {
      console.error("Failed to send email via Resend", error);
    }
  } catch (err) {
    console.error("Failed to send email via Resend", err);
  }
};

export const sendBookingCreatedEmail = async (
  to: string,
  userName: string,
  counselorName: string,
  dateTime: string,
  zoomUrl?: string
) => {
  const subject = `【TAPE】カウンセリング予約が完了しました`;
  const html = `
    <p>${userName} 様</p>
    <p>TAPEをご利用いただきありがとうございます。<br>以下の内容でカウンセリング予約が確定しました。</p>
    <hr>
    <p><strong>カウンセラー:</strong> ${counselorName}</p>
    <p><strong>日時:</strong> ${dateTime}</p>
    ${zoomUrl ? `<p><strong>Zoom URL:</strong> <a href="${zoomUrl}">${zoomUrl}</a></p>` : ""}
    <hr>
    <p>当日はお時間になりましたらマイページまたは上記URLより入室してください。</p>
    <p>キャンセルはマイページより24時間前まで可能です。</p>
  `;
  await sendEmail({ to, subject, html });
};

export const sendBookingCounselorNotificationEmail = async (
  to: string,
  counselorName: string,
  clientName: string,
  dateTime: string,
  planTitle?: string
) => {
  const subject = `【TAPE】新しい予約が確定しました`;
  const html = `
    <p>${counselorName} 様</p>
    <p>以下の内容で新しい予約が確定しました。</p>
    <hr>
    <p><strong>クライアント:</strong> ${clientName}</p>
    ${planTitle ? `<p><strong>プラン:</strong> ${planTitle}</p>` : ""}
    <p><strong>日時:</strong> ${dateTime}</p>
    <hr>
    <p>マイページのダッシュボードから詳細をご確認ください。</p>
  `;
  await sendEmail({ to, subject, html });
};

export const sendBookingAdminAlertEmail = async (
  to: string,
  counselorName: string,
  clientName: string,
  dateTime: string,
  planTitle?: string
) => {
  const subject = `【TAPE】予約確定通知 (${clientName} → ${counselorName})`;
  const html = `
    <p>新しいカウンセリング予約が確定しました。</p>
    <hr>
    <p><strong>クライアント:</strong> ${clientName}</p>
    <p><strong>カウンセラー:</strong> ${counselorName}</p>
    ${planTitle ? `<p><strong>プラン:</strong> ${planTitle}</p>` : ""}
    <p><strong>日時:</strong> ${dateTime}</p>
    <hr>
    <p>管理画面より詳細をご確認ください。</p>
  `;
  await sendEmail({ to, subject, html });
};

export const sendBookingCancelledEmail = async (
  to: string,
  userName: string,
  counselorName: string,
  dateTime: string
) => {
  const subject = `【TAPE】カウンセリング予約キャンセルのお知らせ`;
  const html = `
    <p>${userName} 様</p>
    <p>以下の予約をキャンセルしました。</p>
    <hr>
    <p><strong>カウンセラー:</strong> ${counselorName}</p>
    <p><strong>日時:</strong> ${dateTime}</p>
    <hr>
    <p>ポイントは返還されました。</p>
  `;
  await sendEmail({ to, subject, html });
};

type DiaryCommentEmailParams = {
  to: string;
  entryTitle: string;
  commenterName: string;
  commentSnippet: string;
  entryUrl: string;
};

export const sendDiaryCommentNotificationEmail = async ({
  to,
  entryTitle,
  commenterName,
  commentSnippet,
  entryUrl
}: DiaryCommentEmailParams) => {
  const safeTitle = escapeHtml(entryTitle);
  const safeName = escapeHtml(commenterName);
  const safeSnippet = escapeHtml(truncate(commentSnippet, 280)).replace(/\n/g, "<br>");
  const subject = "【TAPE】あなたの公開日記に新しいコメントが届きました";
  const html = `
    <p>あなたの公開日記「${safeTitle}」に <strong>${safeName}</strong> さんから新しいコメントが届きました。</p>
    <blockquote style="border-left:4px solid #f5ccd8;padding-left:12px;margin:16px 0;font-style:italic;color:#6b4a3f;">
      ${safeSnippet}
    </blockquote>
    <p>下記のリンクからコメントを確認できます。</p>
    <p><a href="${entryUrl}" style="color:#d59da9;text-decoration:underline;">コメントを確認する</a></p>
  `;
  await sendEmail({ to, subject, html });
};

export const sendDiaryCommentReplyEmail = async ({
  to,
  entryTitle,
  commenterName,
  commentSnippet,
  entryUrl
}: DiaryCommentEmailParams) => {
  const safeTitle = escapeHtml(entryTitle);
  const safeName = escapeHtml(commenterName);
  const safeSnippet = escapeHtml(truncate(commentSnippet, 280)).replace(/\n/g, "<br>");
  const subject = "【TAPE】あなたのコメントに返信が届きました";
  const html = `
    <p>あなたがコメントした公開日記「${safeTitle}」に <strong>${safeName}</strong> さんから返信が届きました。</p>
    <blockquote style="border-left:4px solid #f5ccd8;padding-left:12px;margin:16px 0;font-style:italic;color:#6b4a3f;">
      ${safeSnippet}
    </blockquote>
    <p>下記からスレッドを確認して、やりとりを続けられます。</p>
    <p><a href="${entryUrl}" style="color:#d59da9;text-decoration:underline;">返信を確認する</a></p>
  `;
  await sendEmail({ to, subject, html });
};
