const envToBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "no";
};

export const MICHELLE_AI_ENABLED = envToBoolean(process.env.NEXT_PUBLIC_MICHELLE_AI_ENABLED, false);
