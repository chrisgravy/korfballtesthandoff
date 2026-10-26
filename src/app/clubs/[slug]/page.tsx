import Link from "next/link";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { TeamTrendChart } from "@/components/charts";
import { currentSeason, getClubBySlug, getClubWithTeams, getSquad, getStandings, getTeamTrend } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) notFound();
  
  const season = await currentSeason();
  const clubWithTeams = await getClubWithTeams(club.id, season.id);
  if (!clubWithTeams) notFound();
  
  // Get standings for Division 1 (main team)
  const div1Teams = clubWithTeams.teams.filter((t: any) => t.division_id);
  const div1Team = div1Teams[0];
  
  let row: any = null;
  let idx = -1;
  let trend: any[] = [];
  let squad: any[] = [];
  
  if (div1Team) {
    const [table, t, s] = await Promise.all([
      getStandings(season.id, div1Team.division_id),
      getTeamTrend(season.id, div1Team.division_id, div1Team.id),
      getSquad(div1Team.id),
    ]);
    idx = table.findIndex((r) => r.id === div1Team.id);
    row = table[idx];
    trend = t;
    squad = s;
  }
  
  const facts = row ? [
    ["Position", idx + 1], ["Points", row.points], ["Played", row.played], ["Goal difference", row.gd > 0 ? `+${row.gd}` : row.gd],
  ] : [];

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
      <div className="flex items-center gap-4">
        <Crest team={club} size={64} />
        <div>
          <h1 className="text-4xl font-black tracking-tight">{club.name}</h1>
          <p className="text-mute">Founded: {club.founded || "N/A"} · Coach: {club.coach || "N/A"}</p>
        </div>
      </div>
      
      {/* Teams across divisions */}
      <section className="rounded-xl border border-line bg-card p-4">
        <h2 className="mb-3 text-xl font-black">Teams ({season.name})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clubWithTeams.teams.map((team: any) => (
            <Link key={team.id} href={`/clubs/${club.slug}/team/${team.slug}`} className="flex items-center gap-3 rounded-lg border border-line bg-card p-3 hover:border-pitch">
              <Crest team={team} size={32} />
              <span className="font-bold">{team.name}</span>
            </Link>
          ))}
        </div>
      </section>
      
      {/* Main team details (Division 1) */}
      {div1Team && row && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-card p-4">
                <div className="text-3xl font-black">{value}</div>
                <div className="text-sm text-mute">{label}</div>
              </div>
            ))}
          </div>
          <section className="rounded-xl border border-line bg-card p-4">
            <h2 className="mb-3 text-xl font-black">{div1Team.name} · Season form</h2>
            <TeamTrendChart data={trend} color={div1Team.color} />
          </section>
          <section className="rounded-xl border border-line bg-card">
            <h2 className="border-b border-line px-4 py-3 text-xl font-black">{div1Team.name} · Squad</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead className="text-xs text-mute">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Player</th>
                    <th>Gender</th>
                    <th>Apps</th>
                    <th>Min</th>
                    <th>Goals</th>
                    <th>Assists</th>
                    <th>Reb</th>
                    <th>Stl</th>
                    <th>TO</th>
                    <th>Pen</th>
                  </tr>
                </thead>
                <tbody>
                  {squad.map((p: any) => (
                    <tr key={p.id} className="border-t border-line text-center">
                      <td className="p-2 text-left text-mute">{p.shirt}</td>
                      <td className="p-2 text-left"><Link href={`/players/${p.id}`} className="font-bold hover:underline">{p.name}</Link></td>
                      <td>{p.gender}</td>
                      <td>{p.apps}</td>
                      <td>{p.minutes}</td>
                      <td className="font-bold">{p.goals}</td>
                      <td>{p.assists}</td>
                      <td>{p.rebounds}</td>
                      <td>{p.steals}</td>
                      <td>{p.turnovers}</td>
                      <td>{p.penalties}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}