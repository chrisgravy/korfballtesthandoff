import Link from "next/link";
import type { Match } from "@/lib/types";
import { fmtKickoff } from "@/lib/format";

function articleGradient(match: Match): string {
    const gradients = [
        "bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500",
        "bg-gradient-to-br from-blue-500 via-yellow-500 to-red-500",
        "bg-gradient-to-r from-red-500 to-blue-500",
        "bg-gradient-to-b from-yellow-500 to-red-500",
        "bg-gradient-to-tr from-blue-500 to-yellow-500",
        "bg-gradient-to-br from-red-600 via-orange-500 to-blue-600",
    ];
    return gradients[match.id % gradients.length];
}

export function FeaturedArticle({ match }: { match: Match }) {
    return (
        <div className="relative h-80 rounded-2xl overflow-hidden bg-card">
            {match.home.club?.logo_url ? (
                <img
                    src={match.home.club.logo_url}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
            ) : (
                <div className={`absolute inset-0 ${articleGradient(match)}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-8 left-8 right-6 text-white">
                {(() => {
                    const divisionName = match.division?.name;
                    const prefix = divisionName ? `${divisionName} - ` : "";

                    return match.round === 17
                        ? `${prefix}Grand Final`
                        : match.round === 16
                            ? `${prefix}Semi-Final`
                            : `${prefix}Round ${match.round}`;
                })()}
                <h2 className="text-3xl font-black leading-tight mb-2">
                    {match.home.name} vs {match.away.name}
                </h2>
                <p className="text-white/90 text-lg">
                    {match.status === "finished"
                        ? `Final: ${match.homeGoals} - ${match.awayGoals}`
                        : `Scheduled: ${fmtKickoff(match.kickoff)}`}
                </p>
            </div>
            <Link
                href={`/matches/${match.id}`}
                className="absolute bottom-8 right-8 flex items-center gap-2 bg-white text-ink px-4 py-2 rounded-full text-sm font-bold hover:bg-mute/80 transition-colors"
            >
                <span className="text-pitch font-black">▶</span> Read more
            </Link>
        </div>
    );
}
