import { currentSeason, getRound, roundBounds, getCurrentDivisions } from "@/lib/queries";
import { FeaturedArticle } from "@/components/FeaturedArticle";
import { NewsCard } from "@/components/NewsCard";
import { RoundResults } from "@/components/RoundResults";
import { RecentMatchVideos } from "@/components/RecentMatchVideos";
import { NewsFeed } from "@/components/NewsFeed";

export const revalidate = 60;

export default async function Home() {
  const season = await currentSeason();
  const divisions = await getCurrentDivisions();
  const div1 = divisions.find((d) => d.level === 1) ?? divisions[0];

  const { latest } = await roundBounds(season.id, div1.id);

  const rounds = [latest, latest - 1, latest - 2].filter((mw) => mw > 0);
  const matchArrays = await Promise.all(rounds.map((mw) => getRound(season.id, div1.id, mw)));

  const featuredNews = matchArrays[0]?.[0] || null;
  const otherNews = matchArrays[0]?.slice(1, 5) || [];

  return (
    // Content is 1408px wide on large screens (1440 minus 16px page padding each side).
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-6 pt-8">
      {/* Grey panel: 16px padding. Inside it, four equal columns with 16px gaps and cards 566px tall;
          the featured article takes two columns, news and results one each. On phones it all stacks. */}
      <div className="rounded-3xl bg-[#f4f2f5] p-4 dark:bg-white/5">
        <div className="grid grid-cols-1 gap-4 lg:h-[566px] lg:grid-cols-4 lg:grid-rows-1">
          {/* Featured article (two columns) */}
          <section aria-label="Featured" className="lg:col-span-2 lg:min-h-0">
            <div className="overflow-hidden rounded-2xl lg:h-full lg:[&>*]:h-full">
              {featuredNews ? (
                <FeaturedArticle match={featuredNews} />
              ) : (
                <div className="flex h-80 items-center justify-center rounded-2xl bg-card text-mute">
                  No featured news available
                </div>
              )}
            </div>
          </section>

          {/* Latest news: scrolls inside the card if there are more items than fit */}
          <section
            aria-labelledby="latest-news-title"
            className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card lg:min-h-0"
          >
            <h2 id="latest-news-title" className="px-4 py-3 text-xl font-black tracking-tight">
              Latest News
            </h2>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto border-t border-line p-3 [scrollbar-width:thin]">
              {otherNews.length > 0 ? (
                otherNews.map((m) => <NewsCard key={m.id} match={m} />)
              ) : (
                <p className="text-sm text-mute">No recent news</p>
              )}
            </div>
          </section>

          {/* Recent results: its list fills the card and scrolls */}
          <RoundResults />
        </div>
      </div>
      <RecentMatchVideos />
      <NewsFeed source="korfballAustralia" />
      <NewsFeed source="ikf" />
    </main>
  );
}