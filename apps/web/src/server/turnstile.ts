import { getServerEnv, isTurnstileEnabled } from "@/lib/env";

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export const verifyTurnstileToken = async (token?: string | null): Promise<boolean> => {
  if (!isTurnstileEnabled()) {
    return true;
  }

  if (!token) {
    return false;
  }

  const env = getServerEnv();
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY ?? "",
      response: token
    })
  });

  if (!response.ok) {
    console.error("Failed to verify Turnstile token", response.statusText);
    return false;
  }

  const result = (await response.json()) as TurnstileResponse;
  return result.success;
};
