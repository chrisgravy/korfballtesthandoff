import Link from "next/link";
import { Crest } from "@/components/Crest";
import { ClubCard, Col, Columns } from "./ClubCard";
import { sortTeams, splitInTwo } from "./utils";
import type { Club, Division, Team, SquadPlayer } from "@/lib/types";

interface ClubSquadProps {
  club: Club;
  divisions: Division[];
  teams: Team[];
  squadsByTeam: Record<number, SquadPlayer[]>;
}

const TH = "px-2 py-3";

/** One card per team, dealt across the two columns (top division first). */
export function ClubSquad({ club, divisions, teams, squadsByTeam }: ClubSquadProps) {
  const [left, right] = splitInTwo(sortTeams(teams, divisions));

  const card = (team: Team) => {
    const squad = squadsByTeam[team.id] ?? [];
    const division = divisions.find((d) => d.id === team.division_id);
    return (
      <ClubCard
        key={team.id}
        title={
          <span className="flex items-center gap-3">
            <Crest team={{ ...team, logoUrl: club.logo_url }} size={36} />
            <span className="min-w-0">
              <span className="block truncate">{team.name}</span>
              {division && <span className="block text-xs font-bold text-mute">{division.name}</span>}
            </span>
          </span>
        }
      >
        {squad.length > 0 ? (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-xs font-bold uppercase tracking-wide text-mute">
                <tr>
                  <th className={`${TH} pl-6 text-left`}>#</th>
                  <th className={`${TH} text-left`}>Player</th>
                  <th className={TH} title="Appearances">App</th>
                  <th className={TH} title="Goals">G</th>
                  <th className={TH} title="Assists">Ast</th>
                  <th className={TH} title="Rebounds">Reb</th>
                  <th className={TH} title="Steals">Stl</th>
                  <th className={`${TH} pr-6`} title="Turnovers">TO</th>
                </tr>
              </thead>
              <tbody>
                {squad.map((p) => (
                  <tr key={p.id} className="border-t border-line text-center transition-colors hover:bg-bg">
                    <td className="py-3 pl-6 pr-2 text-left text-mute">{p.shirt}</td>
                    <td className="px-2 py-3 text-left">
                      <Link href={`/players/${p.id}`} className="whitespace-nowrap font-bold hover:underline">
                        {p.name}
                      </Link>
                      <span className="ml-1.5 text-xs font-semibold text-mute">{p.gender}</span>
                    </td>
                    <td className="px-2 py-3">{p.apps}</td>
                    <td className="px-2 py-3 font-bold">{p.goals}</td>
                    <td className="px-2 py-3">{p.assists}</td>
                    <td className="px-2 py-3">{p.rebounds}</td>
                    <td className="px-2 py-3">{p.steals}</td>
                    <td className="py-3 pl-2 pr-6">{p.turnovers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border-t border-line px-6 py-8 text-center text-mute">No squad data available.</p>
        )}
      </ClubCard>
    );
  };

  return (
    <Columns>
      <Col>{left.map(card)}</Col>
      <Col>{right.map(card)}</Col>
    </Columns>
  );
}
