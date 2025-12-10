import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

let resendClient: Resend | null = null;

export const getResendClient = () => {
  if (resendClient) {
    return resendClient;
  }

  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    return null;
  }

  resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
};
