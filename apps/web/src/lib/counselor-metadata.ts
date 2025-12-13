export type CounselorSocialLinks = {
  line?: string | null;
  x?: string | null;
  instagram?: string | null;
};

const normalizeUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch (_error) {
    return null;
  }
};

const getMetadataObject = (metadata: unknown): Record<string, unknown> => {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return { ...(metadata as Record<string, unknown>) };
  }
  return {};
};

export const extractCounselorSocialLinks = (metadata: unknown): Required<CounselorSocialLinks> => {
  const base = getMetadataObject(metadata);
  const links = base.social_links;

  const parseField = (value: unknown) => (typeof value === "string" && value.trim().length > 0 ? value : null);

  if (links && typeof links === "object" && !Array.isArray(links)) {
    const typed = links as Record<string, unknown>;
    return {
      line: parseField(typed.line),
      x: parseField(typed.x),
      instagram: parseField(typed.instagram)
    };
  }

  return {
    line: null,
    x: null,
    instagram: null
  };
};

export const mergeCounselorSocialLinks = (
  metadata: unknown,
  links: CounselorSocialLinks
): Record<string, unknown> => {
  const base = getMetadataObject(metadata);

  const mergedLinks = {
    line: normalizeUrl(links.line ?? null),
    x: normalizeUrl(links.x ?? null),
    instagram: normalizeUrl(links.instagram ?? null)
  };

  // Remove undefined fields but keep explicit null (to clear existing values)
  const sanitizedSocialLinks = Object.fromEntries(
    Object.entries(mergedLinks).map(([key, value]) => [key, value ?? null])
  );

  return {
    ...base,
    social_links: sanitizedSocialLinks
  };
};
