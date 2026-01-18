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
  to: string | string[];
  subject: string;
  html: string;
};

export const sendNotificationEmail = async (params: SendEmailParams): Promise<string | null> => {
  if (!isResendEnabled()) {
    console.warn("Resend disabled; skipping email send");
    return null;
  }

  const resend = getResendClient();
  const fromEmail = getResendFromEmail();
  const result = await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html
  });

  if (result.error) {
    throw new Error(`Resend error (${result.error.name}): ${result.error.message}`);
  }

  return result.data?.id ?? null;
};
