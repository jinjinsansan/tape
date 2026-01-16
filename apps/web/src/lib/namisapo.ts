import { load } from "cheerio";
import he from "he";

const NAMISAPO_BASE_URL = (process.env.NAMISAPO_SITE_URL ?? "https://web.namisapo.com").replace(/\/$/, "");

type FetchOptions = {
  next?: { revalidate?: number };
};

const DEFAULT_REVALIDATE_SECONDS = 60 * 60; // 1h

export type NamisapoNewsItem = {
  title: string;
  url: string;
  category?: string;
  dateText: string;
  isoDate?: string;
};

export type NamisapoBlogPost = {
  id: number;
  title: string;
  url: string;
  dateText: string;
  isoDate?: string;
  categories: string[];
  excerpt: string;
  imageUrl?: string | null;
};

export async function fetchNamisapoNews(limit = 4, options: FetchOptions = {}): Promise<NamisapoNewsItem[]> {
  try {
    const response = await fetch(`${NAMISAPO_BASE_URL}/?post_type=news`, {
      method: "GET",
      next: { revalidate: options.next?.revalidate ?? DEFAULT_REVALIDATE_SECONDS },
      headers: { "User-Agent": "TapeApp/1.0 (+https://namisapo.app)" },
    });

    if (!response.ok) {
      console.error("Namisapo news fetch failed", response.status);
      return [];
    }

    const html = await response.text();
    const $ = load(html);
    const items: NamisapoNewsItem[] = [];

    $("#news_cat_all .news_list article").each((_, element) => {
      if (items.length >= limit) {
        return false;
      }

      const anchor = $(element).find("a").first();
      const title = anchor.find(".title span").text().trim();
      const url = anchor.attr("href") || NAMISAPO_BASE_URL;
      const category = anchor.find(".category").text().trim() || undefined;
      const dateNode = anchor.find("time");
      const isoDate = dateNode.attr("datetime") || undefined;
      const dateText = dateNode.text().trim() || isoDate || "";

      if (!title) {
        return;
      }

      items.push({
        title,
        url,
        category,
        dateText,
        isoDate,
      });
    });

    return items;
  } catch (error) {
    console.error("Failed to fetch Namisapo news", error);
    return [];
  }
}

export async function fetchNamisapoBlogPosts(limit = 4, options: FetchOptions = {}): Promise<NamisapoBlogPost[]> {
  try {
    const params = new URLSearchParams({
      rest_route: "/wp/v2/posts",
      per_page: String(limit),
      _embed: "1",
    });

    const response = await fetch(`${NAMISAPO_BASE_URL}/?${params.toString()}`, {
      method: "GET",
      headers: { "User-Agent": "TapeApp/1.0 (+https://namisapo.app)" },
      next: { revalidate: options.next?.revalidate ?? DEFAULT_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      console.error("Namisapo blog fetch failed", response.status);
      return [];
    }

    const json = (await response.json()) as unknown[];

    return json
      .map((item: any) => {
        const id = typeof item?.id === "number" ? item.id : 0;
        const url = typeof item?.link === "string" ? item.link : `${NAMISAPO_BASE_URL}/?p=${id}`;
        const title = decodeHtml(item?.title?.rendered ?? "");
        const excerpt = truncateText(stripHtml(item?.excerpt?.rendered ?? ""));
        const isoDate = typeof item?.date === "string" ? item.date : undefined;
        const dateText = isoDate ? formatJapaneseDate(isoDate) : "";
        const categories = Array.isArray(item?._embedded?.["wp:term"]) ?
          item._embedded["wp:term"].flat().map((term: any) => term?.name).filter(Boolean) : [];
        const imageUrl = item?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;

        if (!title) {
          return null;
        }

        return {
          id,
          title,
          url,
          dateText,
          isoDate,
          categories,
          excerpt,
          imageUrl,
        } satisfies NamisapoBlogPost;
      })
      .filter(Boolean) as NamisapoBlogPost[];
  } catch (error) {
    console.error("Failed to fetch Namisapo blog posts", error);
    return [];
  }
}

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const truncateText = (value: string, maxLength = 140) => {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
};

const decodeHtml = (value: string) => he.decode(value ?? "").trim();

const formatJapaneseDate = (isoDate: string) => {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return isoDate;
    }
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return isoDate;
  }
};
