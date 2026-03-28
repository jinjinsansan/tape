const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const optional = (key: string): string | undefined => process.env[key];

export const env = {
  get LINE_CHANNEL_SECRET() { return required("LINE_CHANNEL_SECRET"); },
  get LINE_CHANNEL_ACCESS_TOKEN() { return required("LINE_CHANNEL_ACCESS_TOKEN"); },
  get NAMISAPO_LINE_CHANNEL_SECRET() { return optional("NAMISAPO_LINE_CHANNEL_SECRET"); },
  get NAMISAPO_LINE_CHANNEL_ACCESS_TOKEN() { return optional("NAMISAPO_LINE_CHANNEL_ACCESS_TOKEN"); },
  get SUPABASE_URL() { return required("SUPABASE_URL"); },
  get SUPABASE_SERVICE_ROLE_KEY() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
  get OPENAI_API_KEY() { return required("OPENAI_API_KEY"); },
  get MICHELLE_MODEL() { return process.env.MICHELLE_MODEL ?? "gpt-4o"; },
  get SUBSCRIBE_URL() { return process.env.SUBSCRIBE_URL ?? "https://namisapo.app/michelle/subscribe"; },
};
