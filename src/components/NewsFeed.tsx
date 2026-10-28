"use client";

import { useEffect, useState } from "react";
import { NEWS_SOURCES, type NewsPost, type NewsSourceKey } from "@/lib/newsSources";

interface NewsFeedProps {
  source: NewsSourceKey;
  title?: string;     // optional override of the source's default title
  pageSize?: number;
}

function timeAgo(iso: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["week", 604800],
    ["day", 86400], ["hour", 3600], ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return "just now";
}

export function NewsFeed({ source, title, pageSize = 5 }: NewsFeedProps) {
  const config = NEWS_SOURCES[source];

  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Reload from scratch whenever the source changes
  useEffect(() => {
    let cancelled = false;
    setPosts([]);
    setHasMore(true);

    config.fetchPosts(0, pageSize).then((data) => {
      if (cancelled) return;
      setPosts(data);
      setHasMore(data.length === pageSize);
    });

    return () => {
      cancelled = true;
    };
  }, [source, pageSize, config]);

  const loadMore = async () => {
    setLoading(true);
    const data = await config.fetchPosts(posts.length, pageSize);
    setPosts((prev) => [...prev, ...data]);
    setHasMore(data.length === pageSize);
    setLoading(false);
  };

  return (
    <section className="mt-12 mb-12">
      <div className="rounded-3xl bg-[#f4f2f5] p-4 dark:bg-white/5">
        <div className="mb-6">
          <h2 className="text-2xl font-black">{title ?? config.title}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-line bg-card p-4">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                <h3 className="font-bold text-ink mb-1">{post.title}</h3>
              </a>
              <span className="text-xs text-mute uppercase block mb-2">{post.source}</span>
              <span className="text-xs text-mute">{timeAgo(post.date)}</span>
            </article>
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded-full bg-pitch text-white px-6 py-2 text-sm font-bold hover:bg-pitch/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "View More"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}