import { NextRequest, NextResponse } from "next/server";
import type { NewsPost } from "@/lib/newsSources";

const FETCH_COUNT = 30; // how many to pull from each source before merging

// WordPress returns titles with HTML entities (&#8211;, &#8217;, etc.)
function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function getWebsitePosts(): Promise<NewsPost[]> {
  const res = await fetch(
    `https://korfball.org.au/wp-json/wp/v2/posts?per_page=${FETCH_COUNT}&_fields=id,date_gmt,link,title`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`Website feed failed: ${res.status}`);

  const raw: any[] = await res.json();
  return raw.map((p) => ({
    id: `web-${p.id}`,
    title: decodeHtml(p.title.rendered),
    source: "Website",
    date: `${p.date_gmt}Z`,
    url: p.link,
  }));
}

async function getFacebookPosts(): Promise<NewsPost[]> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_TOKEN;
  if (!pageId || !token) return []; // not configured, skip quietly

  // Use whichever Graph API version is current
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/posts?fields=id,message,created_time,permalink_url&limit=${FETCH_COUNT}&access_token=${token}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error(`Facebook feed failed: ${res.status}`);

  const json = await res.json();
  return (json.data ?? [])
    .filter((p: any) => p.message) // skip posts with no text
    .map((p: any) => ({
      id: `fb-${p.id}`,
      // Facebook posts have no title, so use the first line, trimmed
      title: p.message.split("\n")[0].slice(0, 120),
      source: "Facebook",
      date: p.created_time,
      url: p.permalink_url,
    }));
}

export async function GET(req: NextRequest) {
  const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 5);

  // allSettled so one source failing doesn't take down the other
  const results = await Promise.allSettled([getWebsitePosts(), getFacebookPosts()]);
  const posts = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json(posts.slice(offset, offset + limit));
}