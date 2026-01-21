const envToBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "no";
};

const warnedFlags = new Set<string>();

const warnMissingFlag = (flagName: string, envKeys: string[]) => {
  if (typeof console === "undefined" || warnedFlags.has(flagName)) {
    return;
  }
  warnedFlags.add(flagName);
  console.warn(
    `[FeatureFlags] ${flagName} is disabled because none of ${envKeys.join(", ")} are defined.`
  );
};

const resolveBooleanFlag = (flagName: string, envKeys: string[], defaultValue: boolean) => {
  for (const key of envKeys) {
    const value = process.env[key];
    if (value !== undefined) {
      return envToBoolean(value, defaultValue);
    }
  }

  warnMissingFlag(flagName, envKeys);
  return defaultValue;
};

export const MICHELLE_AI_ENABLED = resolveBooleanFlag(
  "MICHELLE_AI_ENABLED",
  ["NEXT_PUBLIC_MICHELLE_AI_ENABLED", "MICHELLE_AI_ENABLED"],
  false
);

export const MICHELLE_ATTRACTION_AI_ENABLED = resolveBooleanFlag(
  "MICHELLE_ATTRACTION_AI_ENABLED",
  ["NEXT_PUBLIC_MICHELLE_ATTRACTION_AI_ENABLED", "MICHELLE_ATTRACTION_AI_ENABLED"],
  false
);
