import { NextRequest, NextResponse } from "next/server";
import type { NewsPost } from "@/lib/newsSources";

const BASE_URL = "https://korfball.sport";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Matches dates like "27 Oct 2026" or "28 Sept 2026" (the site writes "Sept")
const DATE_AT_END = /(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})\s*$/;

function toIso(m: RegExpMatchArray): string | null {
  const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(m[3]), month, Number(m[1]), 12)).toISOString();
}

// Each article link contains a category, a title and a date.
// Split on tag boundaries so we can tell them apart.
function parseAnchor(inner: string) {
  const parts = decodeHtml(inner.replace(/<[^>]+>/g, "|"))
    .split("|")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const last = parts[parts.length - 1];
  const m = last.match(DATE_AT_END);
  if (!m) return null;
  const date = toIso(m);
  if (!date) return null;

  const beforeDate = last.slice(0, m.index).trim(); // empty if the date is its own element
  const rest = beforeDate ? [...parts.slice(0, -1), beforeDate] : parts.slice(0, -1);
  if (rest.length === 0) return null;

  if (rest.length === 1) return { title: rest[0], date };
  return { category: rest[0], title: rest.slice(1).join(" "), date };
}

async function getIkfPosts(): Promise<NewsPost[]> {
  const res = await fetch(`${BASE_URL}/news`, {
    headers: { "User-Agent": "KorfballAustraliaApp/1.0", Accept: "text/html" },
    next: { revalidate: 600 }, // cache for 10 minutes
  });
  if (!res.ok) throw new Error(`IKF news page failed: ${res.status}`);
  const html = await res.text();

  const posts = new Map<string, NewsPost>(); // keyed by slug to drop duplicate links
  const anchorRe = /<a\b[^>]*?href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorRe)) {
    const slugMatch = match[1].match(
      /^(?:https?:\/\/korfball\.sport)?\/news\/([^/?#]+)\/?$/
    );
    if (!slugMatch) continue;

    const slug = slugMatch[1];
    if (posts.has(slug)) continue;

    const parsed = parseAnchor(match[2]);
    if (!parsed) continue;

    posts.set(slug, {
      id: `ikf-${slug}`,
      title: parsed.title,
      source: parsed.category ? `IKF · ${parsed.category}` : "IKF",
      date: parsed.date,
      url: `${BASE_URL}/news/${slug}`,
    });
  }

  if (posts.size === 0) {
    throw new Error("No IKF articles found. The page markup may have changed.");
  }

  // Newest first. The sort is stable, so same-day articles keep the site's order.
  return [...posts.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function GET(req: NextRequest) {
  const offset = Math.max(Number(req.nextUrl.searchParams.get("offset") ?? 0), 0);
  const limit = Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 5), 1);

  try {
    const posts = await getIkfPosts();
    return NextResponse.json(posts.slice(offset, offset + limit));
  } catch (err) {
    console.error("IKF news source failed:", err);
    return NextResponse.json({ error: "Failed to load IKF news" }, { status: 502 });
  }
}