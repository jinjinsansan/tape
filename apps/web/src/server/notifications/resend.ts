import { Resend } from "resend";
import { getServerEnv, isResendEnabled, getResendFromEmail } from "@/lib/env";

let cachedResend: Resend | null = null;

const getResendClient = (): Resend => {
  if (!isResendEnabled()) {
    throw new Error("Resend is not configured.");
  }

  if (cachedResend) {
    return cachedResend;
  }

  const env = getServerEnv();
  cachedResend = new Resend(env.RESEND_API_KEY);
  return cachedResend;
};

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export const sendNotificationEmail = async (params: SendEmailParams) => {
  if (!isResendEnabled()) {
    console.warn("Resend disabled; skipping email send");
    return null;
  }

  const resend = getResendClient();
  const fromEmail = getResendFromEmail();
  return resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html
  });
};
