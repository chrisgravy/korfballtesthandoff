import Link from "next/link";
import { Crest } from "./Crest";
import { fmtKickoff } from "@/lib/format";
import type { Match } from "@/lib/types";

type GameLeader = {
  name: string;
  team: string;
  number?: number;
  position?: string;
  goals: number;
  rebounds: number;
  assists: number;
  photo_url?: string;
};

type FixtureWithExtras = Match & {
  leaders?: GameLeader[];
  recap_thumbnail_url?: string;
};

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (!match) return null;
  const videoId = match[1];
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function FixtureStrip({
  matches,
}: {
  matches: FixtureWithExtras[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {matches.map((m) => {
        const live = m.status === "live";
        const finished = m.status === "finished";
        const leaders = m.leaders ?? [];
        const homeLosing =
          finished &&
          m.homeGoals != null &&
          m.awayGoals != null &&
          m.homeGoals < m.awayGoals;

        const awayLosing =
          finished &&
          m.homeGoals != null &&
          m.awayGoals != null &&
          m.awayGoals < m.homeGoals;

        return (
          <article
            key={m.id}
            className="grid grid-cols-1 overflow-hidden rounded-lg
              bg-card shadow-sm
              lg:grid-cols-[1.65fr_1.3fr_1fr]"
          >
            {/* MATCH SCORE */}
            <section className="flex min-w-0 flex-col
                border-b border-line px-4 py-5
                lg:border-b-0 lg:border-r lg:px-2.5">
              <div className="grid grid-cols-[1fr_auto_1fr]
                items-center gap-3">
                {/* Home team */}
                <div className="flex min-w-0 flex-col items-center
                  text-center">
                  <Crest team={m.home} size={40} />
                  <span className="mt-1.5 text-sm font-semibold text-ink">
                    {m.home.name}
                  </span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <span
                    className={`text-2xl font-black tabular-nums sm:text-3xl ${homeLosing ? "text-[#555965]" : "text-ink"
                      }`}
                  >
                    {m.homeGoals ?? "–"}
                  </span>

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-extrabold uppercase
                      text-ink">
                      {finished
                        ? "Final"
                        : live
                          ? "Live"
                          : fmtKickoff(m.kickoff)}
                    </span>

                    {live && (
                      <span className="h-2 w-2 rounded-full
                        bg-red-500" />
                    )}

                    {finished && m.homeGoals != null && m.awayGoals != null && (
                      <span className="text-sm leading-none">
                        {m.homeGoals > m.awayGoals ? "◀" : m.awayGoals > m.homeGoals ? "▶" : "–"}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-2xl font-black tabular-nums sm:text-3xl ${awayLosing ? "text-[#555965]" : "text-ink"
                      }`}
                  >
                    {m.awayGoals ?? "–"}
                  </span>
                </div>

                {/* Away team */}
                <div className="flex min-w-0 flex-col items-center
                  text-center">
                  <Crest team={m.away} size={40} />
                  <span className="mt-1.5 text-sm font-semibold text-ink">
                    {m.away.name}
                  </span>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-1 gap-2 pt-5">
                <Link
                  href={`/matches/${m.id}`}
                  className="rounded-md border border-line px-3 py-2
                    text-center text-sm font-bold text-ink
                    transition hover:bg-muted"
                >
                  Game Stats
                </Link>
              </div>
            </section>

            {/* GAME LEADERS */}
            <section className="min-w-0 border-b border-line px-4 py-5
              lg:border-b-0 lg:border-r lg:px-5">
              <h2 className="text-base font-black uppercase tracking-tight
                text-ink">
                Game Leaders
              </h2>

              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_32px_32px_32px]
                gap-2 border-b border-line pb-2 text-center
                text-xs font-bold text-mute">
                <span className="text-left">Player</span>
                <span>G</span>
                <span>REB</span>
                <span>AST</span>
              </div>

              {leaders.length > 0 ? (
                <div>
                  {leaders.slice(0, 4).map((player, index) => (
                    <div
                      key={`${player.name}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_32px_32px_32px]
                        items-center gap-2 border-b border-line
                        py-2.5 text-center last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-2.5
                        text-left">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-full
                              object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0
                            items-center justify-center rounded-full
                            bg-muted text-sm font-bold text-ink">
                            {player.name.charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {player.name}
                          </p>
                          <p className="truncate text-[11px] text-mute">
                            {player.team}
                            {player.number != null
                              ? ` | #${player.number}`
                              : ""}
                            {player.position
                              ? ` | ${player.position}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <span className="text-sm font-semibold tabular-nums">
                        {player.goals}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {player.rebounds}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {player.assists}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-16 items-center justify-center
                  text-center text-sm text-mute">
                  {finished
                    ? "Player statistics coming soon"
                    : "Leaders will appear when stats are available"}
                </div>
              )}

              <Link
                href={`/matches/${m.id}`}
                className="mt-3 inline-block text-xs font-bold
                  text-ink hover:underline"
              >
                View all statistics →
              </Link>
            </section>

            {/* GAME RECAP */}
            <section className="min-w-0 px-4 py-5 lg:px-2.5">
              <h2 className="text-base font-black uppercase tracking-tight
                text-ink">
                Full Game
              </h2>

              {m.video_url ? (
                <a
                  href={m.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative mt-3 block aspect-video
                    overflow-hidden rounded-lg bg-muted"
                >
                  {m.recap_thumbnail_url ? (
                    <img
                      src={m.recap_thumbnail_url}
                      alt={`${m.home.name} vs ${m.away.name} recap`}
                      className="h-full w-full object-cover
                        transition group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={getYouTubeThumbnail(m.video_url) || "https://via.placeholder.com/640x360.png?text=No+Thumbnail"}
                      alt={`${m.home.name} vs ${m.away.name} recap`}
                      className="h-full w-full object-cover
                        transition group-hover:scale-105"
                    />
                  )}

                  <span className="absolute bottom-2 left-2 flex
                    h-8 w-8 items-center justify-center rounded-full
                    bg-yellow-400 text-sm text-black shadow">
                    ▶
                  </span>
                </a>
              ) : (
                <div className="mt-3 flex aspect-video items-center
                  justify-center rounded-lg bg-muted p-4 text-center
                  text-sm text-mute">
                  No game video available
                </div>
              )}
            </section>
          </article>
        );
      })}
    </div>
  );
}