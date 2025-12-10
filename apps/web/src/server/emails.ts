import { getResendClient } from "@/lib/email";
import { isResendEnabled } from "@/lib/env";

const SENDER_EMAIL = "TAPE <no-reply@namisapo.app>";

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
