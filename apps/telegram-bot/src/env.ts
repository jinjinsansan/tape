const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const env = {
  get TELEGRAM_BOT_TOKEN() { return required("TELEGRAM_BOT_TOKEN"); },
  get SUPABASE_URL() { return required("SUPABASE_URL"); },
  get SUPABASE_SERVICE_ROLE_KEY() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
  get OPENAI_API_KEY() { return required("OPENAI_API_KEY"); },
  get MICHELLE_MODEL() { return process.env.MICHELLE_MODEL ?? "gpt-4o"; },
};
