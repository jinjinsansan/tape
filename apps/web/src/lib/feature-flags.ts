const envToBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "no";
};

const warnMissingFlag = (flagName: string) => {
  if (typeof console !== "undefined") {
    console.warn(`[FeatureFlags] ${flagName} is disabled because environment variable is not set`);
  }
};

/**
 * Resolves boolean flag from environment variables with static access.
 * Next.js only replaces process.env.XXX when accessed statically (not process.env[key]).
 */
const resolveBooleanFlag = (
  flagName: string,
  publicValue: string | undefined,
  serverValue: string | undefined,
  defaultValue: boolean
) => {
  const value = publicValue ?? serverValue;
  if (value !== undefined) {
    return envToBoolean(value, defaultValue);
  }

  warnMissingFlag(flagName);
  return defaultValue;
};

export const MICHELLE_AI_ENABLED = resolveBooleanFlag(
  "MICHELLE_AI_ENABLED",
  process.env.NEXT_PUBLIC_MICHELLE_AI_ENABLED,
  process.env.MICHELLE_AI_ENABLED,
  false
);

export const MICHELLE_ATTRACTION_AI_ENABLED = resolveBooleanFlag(
  "MICHELLE_ATTRACTION_AI_ENABLED",
  process.env.NEXT_PUBLIC_MICHELLE_ATTRACTION_AI_ENABLED,
  process.env.MICHELLE_ATTRACTION_AI_ENABLED,
  false
);
