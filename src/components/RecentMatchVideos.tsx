import { getLatestMatchesWithVideos } from "@/lib/queries";
import type { Match } from "@/lib/types";

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

async function fetchYouTubeVideo(url: string) {
  const videoId = getYouTubeVideoId(url);
  const fallbackThumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "";
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { headers: { Accept: "application/json" }, next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("oembed failed");
    const data = await res.json();
    return {
      title: String(data.title ?? ""),
      channel: String(data.author_name ?? ""),
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : String(data.thumbnail_url ?? ""),
    };
  } catch {
    return { title: "", channel: "", thumbnail: fallbackThumbnail };
  }
}

export async function RecentMatchVideos() {
  const matches = await getLatestMatchesWithVideos(10);
  const videos = matches.filter(
    (m): m is Match & { video_url: string } => Boolean(m.video_url)
  );

  const fetched = await Promise.allSettled(videos.map((m) => fetchYouTubeVideo(m.video_url)));

  const items = videos.map((m, i) => {
    const result = fetched[i];
    const meta = result.status === "fulfilled" ? result.value : { title: "", channel: "", thumbnail: "" };
    const videoId = getYouTubeVideoId(m.video_url);
    const thumbnail = meta.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "");
    return {
      match: m,
      title: meta.title || `${m.home.name} vs ${m.away.name} Highlights`,
      channel: meta.channel || "Korfball SA",
      thumbnail,
      videoId,
    };
  });

  if (items.length === 0) return null;

  return (
    <section className="mt-10 mb-12">
      <div className="rounded-3xl bg-[#f4f2f5] p-4 dark:bg-white/5">
        <h2 className="text-2xl font-black mb-4 tracking-tight">Watch Recent Matches</h2>
        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4">
          {items.map((item) => (
            <a
              key={item.match.id}
              href={item.match.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-[44%] lg:w-[22%] flex flex-col gap-2"
            >
              <div className="rounded-xl border border-line bg-card p-3 overflow-hidden">
                <div className="aspect-video relative overflow-hidden rounded-lg group">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="h-full w-full object-cover transition group-hover:scale-105 duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition" />
                  <div className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-black text-xl shadow">
                    ▶
                  </div>
                </div>
                <h3 className="font-semibold text-ink line-clamp-2">{item.title}</h3>
                <p className="text-xs text-mute">{item.channel}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
