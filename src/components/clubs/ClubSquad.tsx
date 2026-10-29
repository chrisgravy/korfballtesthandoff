import Link from "next/link";
import { Crest } from "@/components/Crest";
import type { Team, SquadPlayer } from "@/lib/types";

interface ClubSquadProps {
  teams: Team[];
  squadsByTeam: Record<number, SquadPlayer[]>;
}

export function ClubSquad({ teams, squadsByTeam }: ClubSquadProps) {
  return (
    <div className="grid gap-6">
      {teams.map((team) => {
        const squad = squadsByTeam[team.id] ?? [];
        return (
          <section key={team.id} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Crest team={team} size={32} />
              <h2 className="text-xl font-black">{team.name}</h2>
            </div>
            {squad.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="text-xs text-muted">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Player</th>
                      <th className="p-2 text-left">Gender</th>
                      <th className="p-2">Apps</th>
                      <th className="p-2">Goals</th>
                      <th className="p-2">Assists</th>
                      <th className="p-2">Reb</th>
                      <th className="p-2">Stl</th>
                      <th className="p-2">TO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {squad.map((p) => (
                      <tr key={p.id} className="border-t border-line text-center">
                        <td className="p-2 text-left text-muted">{p.shirt}</td>
                        <td className="p-2 text-left">
                          <Link href={`/players/${p.id}`} className="font-bold hover:underline">
                            {p.name}
                          </Link>
                        </td>
                        <td className="p-2">{p.gender}</td>
                        <td className="p-2">{p.apps}</td>
                        <td className="p-2 font-bold">{p.goals}</td>
                        <td className="p-2">{p.assists}</td>
                        <td className="p-2">{p.rebounds}</td>
                        <td className="p-2">{p.steals}</td>
                        <td className="p-2">{p.turnovers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted py-4">No squad data available.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
