export function normalizeYouTubeEmbedUrl(raw?: string | null): string | null {
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();

    // Already embed format
    if (host.includes("youtube.com") && url.pathname.startsWith("/embed/")) {
      return url.toString();
    }

    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = url.pathname.replace(/^\//, "").split("/")[0] || null;
    } else if (host.includes("youtube.com")) {
      if (url.searchParams.has("v")) {
        videoId = url.searchParams.get("v");
      } else if (url.pathname.startsWith("/shorts/")) {
        videoId = url.pathname.split("/")[2] || url.pathname.split("/")[1] || null;
      } else if (url.pathname.startsWith("/live/")) {
        videoId = url.pathname.split("/")[2] || url.pathname.split("/")[1] || null;
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch (error) {
    console.warn("Failed to normalize YouTube URL", error);
  }

  return raw;
}
