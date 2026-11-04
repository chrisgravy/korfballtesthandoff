import { pool } from "./db";
import type {
  Club, Division, Gender, HistoryRow, LeaguePlayer, Match, Player, PlayerCareerMatch, PlayerMatch, Season,
  SeasonStats, SquadPlayer, StandingRow, Team, TeamRef, TrendPoint, ClubRef, DivisionRef, SeasonRef, ClubWithTeams,
} from "./types";

function toClubRef(c: any): ClubRef {
  return { id: c.id, slug: c.slug, name: c.name, short: c.short, color: c.color, logo_url: c.logo_url, founded: c.founded, coach: c.coach };
}

function toDivisionRef(d: any): DivisionRef {
  return { id: d.id, season_id: d.season_id, name: d.name, level: d.level };
}

function toSeasonRef(s: any): SeasonRef {
  return { id: s.id, name: s.name, is_current: s.is_current };
}

const ref = (slug: string, name: string, short: string, color: string, club?: ClubRef): TeamRef => ({ slug, name, short, color, club });

export async function currentSeason(): Promise<SeasonRef> {
  const { rows } = await pool.query<SeasonRef>("SELECT id, name, is_current FROM seasons WHERE is_current LIMIT 1");
  if (!rows[0]) throw new Error("No current season. Run the importer.");
  return rows[0];
}

export async function getSeasonByName(name: string): Promise<SeasonRef | null> {
  const { rows } = await pool.query<SeasonRef>("SELECT id, name, is_current FROM seasons WHERE name = $1", [name]);
  return rows[0] ?? null;
}

export async function getSeasons(): Promise<SeasonRef[]> {
  const { rows } = await pool.query<SeasonRef>("SELECT id, name, is_current FROM seasons ORDER BY name DESC");
  return rows;
}

export async function getDivisions(seasonId: number): Promise<Division[]> {
  const { rows } = await pool.query<Division>(
    "SELECT id, season_id, name, level FROM divisions WHERE season_id = $1 ORDER BY level",
    [seasonId]
  );
  return rows;
}

export async function getCurrentDivisions(): Promise<Division[]> {
  const season = await currentSeason();
  return getDivisions(season.id);
}

export async function roundBounds(seasonId: number, divisionId: number) {
  const { rows } = await pool.query<{ latest: number; total: number }>(
    `SELECT COALESCE(MAX(round) FILTER (WHERE status IN ('finished', 'live')), 1)::int AS latest,
            MAX(round)::int AS total
     FROM matches WHERE season_id = $1 AND division_id = $2`,
    [seasonId, divisionId],
  );
  return rows[0];
}

export async function getStandings(seasonId: number, divisionId: number): Promise<StandingRow[]> {
  const { rows } = await pool.query<StandingRow>(
    `SELECT ds.division_id, ds.season_id, ds.division_name, ds.level,
            ds.team_id as id, ds.slug, ds.name, ds.short, ds.color,
            ds.club_id, ds.club_name, ds.club_slug,
            ds.played, ds.won, ds.drawn, ds.gg_won, ds.gg_lost, ds.lost,
            ds.gf, ds.ga, ds.gd, ds.points, c.logo_url AS club_logo_url
     FROM division_standings ds
     JOIN clubs c ON c.id = ds.club_id
     WHERE ds.season_id = $1 AND ds.division_id = $2
     ORDER BY ds.points DESC, ds.gd DESC, ds.gf DESC, ds.name`,
    [seasonId, divisionId],
  );
  return rows;
}

type MatchRow = {
  id: number; season_id: number; division_id: number; round: number; kickoff: Date; 
  status: Match["status"]; period: number | null; minute: number | null;
  home_q1: number | null; away_q1: number | null;
  home_q2: number | null; away_q2: number | null;
  home_q3: number | null; away_q3: number | null;
  home_q4: number | null; away_q4: number | null;
  home_gg: number | null; away_gg: number | null;
  home_goals: number | null; away_goals: number | null;
  result_type: Match["result_type"];
  home_slug: string; home_name: string; home_short: string; home_color: string; 
  home_club_id: number; home_club_slug: string; home_club_name: string; home_club_short: string; home_club_color: string; home_club_logo_url: string | null;
  away_slug: string; away_name: string; away_short: string; away_color: string; 
  away_club_id: number; away_club_slug: string; away_club_name: string; away_club_short: string; away_club_color: string; away_club_logo_url: string | null;
  div_name: string; div_level: number;
  video_url: string | null;
};

export async function getRound(seasonId: number, divisionId: number, round: number): Promise<Match[]> {
  const { rows } = await pool.query<MatchRow>(
    `SELECT m.id, m.season_id, m.division_id, m.round, m.kickoff, m.status, m.period, m.minute,
            m.home_q1, m.away_q1, m.home_q2, m.away_q2, m.home_q3, m.away_q3, m.home_q4, m.away_q4,
            m.home_gg, m.away_gg, m.home_goals, m.away_goals, m.result_type, m.video_url,
            h.slug AS home_slug, h.name AS home_name, h.short AS home_short, h.color AS home_color,
            hc.id AS home_club_id, hc.slug AS home_club_slug, hc.name AS home_club_name, hc.short AS home_club_short, hc.color AS home_club_color, hc.logo_url AS home_club_logo_url,
            a.slug AS away_slug, a.name AS away_name, a.short AS away_short, a.color AS away_color,
            ac.id AS away_club_id, ac.slug AS away_club_slug, ac.name AS away_club_name, ac.short AS away_club_short, ac.color AS away_club_color, ac.logo_url AS away_club_logo_url,
            d.name AS div_name, d.level AS div_level
     FROM matches m
     JOIN teams h ON h.id = m.home_id
     JOIN clubs hc ON hc.id = h.club_id
     JOIN teams a ON a.id = m.away_id
     JOIN clubs ac ON ac.id = a.club_id
     JOIN divisions d ON d.id = m.division_id
     WHERE m.season_id = $1 AND m.division_id = $2 AND m.round = $3
     ORDER BY m.kickoff, m.id`,
    [seasonId, divisionId, round],
  );
  return rows.map((r) => ({
    id: r.id, season_id: r.season_id, division_id: r.division_id, round: r.round, kickoff: r.kickoff.toISOString(),
    status: r.status, period: r.period, minute: r.minute,
    home_q1: r.home_q1, away_q1: r.away_q1,
    home_q2: r.home_q2, away_q2: r.away_q2,
    home_q3: r.home_q3, away_q3: r.away_q3,
    home_q4: r.home_q4, away_q4: r.away_q4,
    home_gg: r.home_gg, away_gg: r.away_gg,
    home_goals: r.home_goals, away_goals: r.away_goals,
    homeGoals: r.home_goals, awayGoals: r.away_goals, // aliases for compatibility
    result_type: r.result_type,
    home: ref(r.home_slug, r.home_name, r.home_short, r.home_color, {
      id: r.home_club_id, slug: r.home_club_slug, name: r.home_club_name, short: r.home_club_short, color: r.home_club_color,
      logo_url: r.home_club_logo_url ?? undefined,
    }),
    away: ref(r.away_slug, r.away_name, r.away_short, r.away_color, {
      id: r.away_club_id, slug: r.away_club_slug, name: r.away_club_name, short: r.away_club_short, color: r.away_club_color,
      logo_url: r.away_club_logo_url ?? undefined,
    }),
    video_url: r.video_url ?? null,
    division: { id: r.division_id, season_id: r.season_id, name: r.div_name, level: r.div_level },
  }));
}

export async function getMatch(matchId: number): Promise<Match | null> {
  const { rows } = await pool.query<MatchRow>(
    `SELECT m.id, m.season_id, m.division_id, m.round, m.kickoff, m.status, m.period, m.minute,
            m.home_q1, m.away_q1, m.home_q2, m.away_q2, m.home_q3, m.away_q3, m.home_q4, m.away_q4,
            m.home_gg, m.away_gg, m.home_goals, m.away_goals, m.result_type, m.video_url,
            h.slug AS home_slug, h.name AS home_name, h.short AS home_short, h.color AS home_color,
            hc.id AS home_club_id, hc.slug AS home_club_slug, hc.name AS home_club_name, hc.short AS home_club_short, hc.color AS home_club_color, hc.logo_url AS home_club_logo_url,
            a.slug AS away_slug, a.name AS away_name, a.short AS away_short, a.color AS away_color,
            ac.id AS away_club_id, ac.slug AS away_club_slug, ac.name AS away_club_name, ac.short AS away_club_short, ac.color AS away_club_color, ac.logo_url AS away_club_logo_url,
            d.name AS div_name, d.level AS div_level
     FROM matches m
     JOIN teams h ON h.id = m.home_id
     JOIN clubs hc ON hc.id = h.club_id
     JOIN teams a ON a.id = m.away_id
     JOIN clubs ac ON ac.id = a.club_id
     JOIN divisions d ON d.id = m.division_id
     WHERE m.id = $1`,
    [matchId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id, season_id: r.season_id, division_id: r.division_id, round: r.round, kickoff: r.kickoff.toISOString(),
    status: r.status, period: r.period, minute: r.minute,
    home_q1: r.home_q1, away_q1: r.away_q1,
    home_q2: r.home_q2, away_q2: r.away_q2,
    home_q3: r.home_q3, away_q3: r.away_q3,
    home_q4: r.home_q4, away_q4: r.away_q4,
    home_gg: r.home_gg, away_gg: r.away_gg,
    home_goals: r.home_goals, away_goals: r.away_goals,
    homeGoals: r.home_goals, awayGoals: r.away_goals,
    result_type: r.result_type,
    home: ref(r.home_slug, r.home_name, r.home_short, r.home_color, {
      id: r.home_club_id, slug: r.home_club_slug, name: r.home_club_name, short: r.home_club_short, color: r.home_club_color,
      logo_url: r.home_club_logo_url ?? undefined,
    }),
    away: ref(r.away_slug, r.away_name, r.away_short, r.away_color, {
      id: r.away_club_id, slug: r.away_club_slug, name: r.away_club_name, short: r.away_club_short, color: r.away_club_color,
      logo_url: r.away_club_logo_url ?? undefined,
    }),
    video_url: r.video_url ?? null,
    division: { id: r.division_id, season_id: r.season_id, name: r.div_name, level: r.div_level },
  };
}

export async function getLatestMatchesWithVideos(limit = 10): Promise<Match[]> {
  const season = await currentSeason();
  const { rows } = await pool.query<MatchRow>(
    `SELECT m.id, m.season_id, m.division_id, m.round, m.kickoff, m.status, m.period, m.minute,
            m.home_q1, m.away_q1, m.home_q2, m.away_q2, m.home_q3, m.away_q3, m.home_q4, m.away_q4,
            m.home_gg, m.away_gg, m.home_goals, m.away_goals, m.result_type, m.video_url,
            h.slug AS home_slug, h.name AS home_name, h.short AS home_short, h.color AS home_color,
            hc.id AS home_club_id, hc.slug AS home_club_slug, hc.name AS home_club_name, hc.short AS home_club_short, hc.color AS home_club_color, hc.logo_url AS home_club_logo_url,
            a.slug AS away_slug, a.name AS away_name, a.short AS away_short, a.color AS away_color,
            ac.id AS away_club_id, ac.slug AS away_club_slug, ac.name AS away_club_name, ac.short AS away_club_short, ac.color AS away_club_color, ac.logo_url AS away_club_logo_url,
            d.name AS div_name, d.level AS div_level
     FROM matches m
     JOIN teams h ON h.id = m.home_id
     JOIN clubs hc ON hc.id = h.club_id
     JOIN teams a ON a.id = m.away_id
     JOIN clubs ac ON ac.id = a.club_id
     JOIN divisions d ON d.id = m.division_id
     WHERE m.season_id = $1 AND m.video_url IS NOT NULL AND m.status = 'finished'
     ORDER BY m.kickoff DESC, m.id DESC
     LIMIT $2`,
    [season.id, limit]
  );
  return rows.map((r) => ({
    id: r.id, season_id: r.season_id, division_id: r.division_id, round: r.round, kickoff: r.kickoff.toISOString(),
    status: r.status, period: r.period, minute: r.minute,
    home_q1: r.home_q1, away_q1: r.away_q1,
    home_q2: r.home_q2, away_q2: r.away_q2,
    home_q3: r.home_q3, away_q3: r.away_q3,
    home_q4: r.home_q4, away_q4: r.away_q4,
    home_gg: r.home_gg, away_gg: r.away_gg,
    home_goals: r.home_goals, away_goals: r.away_goals,
    homeGoals: r.home_goals, awayGoals: r.away_goals,
    result_type: r.result_type,
    home: ref(r.home_slug, r.home_name, r.home_short, r.home_color, {
      id: r.home_club_id, slug: r.home_club_slug, name: r.home_club_name, short: r.home_club_short, color: r.home_club_color,
      logo_url: r.home_club_logo_url ?? undefined,
    }),
    away: ref(r.away_slug, r.away_name, r.away_short, r.away_color, {
      id: r.away_club_id, slug: r.away_club_slug, name: r.away_club_name, short: r.away_club_short, color: r.away_club_color,
      logo_url: r.away_club_logo_url ?? undefined,
    }),
    video_url: r.video_url ?? null,
    division: { id: r.division_id, season_id: r.season_id, name: r.div_name, level: r.div_level },
  }));
}

export async function getMatchesByClub(
  seasonId: number,
  clubId: number,
  divisionId?: number
): Promise<Match[]> {
  let sql = `
    SELECT m.id, m.season_id, m.division_id, m.round, m.kickoff, m.status, m.period, m.minute,
            m.home_q1, m.away_q1, m.home_q2, m.away_q2, m.home_q3, m.away_q3, m.home_q4, m.away_q4,
            m.home_gg, m.away_gg, m.home_goals, m.away_goals, m.result_type, m.video_url,
            h.slug AS home_slug, h.name AS home_name, h.short AS home_short, h.color AS home_color,
            hc.id AS home_club_id, hc.slug AS home_club_slug, hc.name AS home_club_name, hc.short AS home_club_short, hc.color AS home_club_color, hc.logo_url AS home_club_logo_url,
            a.slug AS away_slug, a.name AS away_name, a.short AS away_short, a.color AS away_color,
            ac.id AS away_club_id, ac.slug AS away_club_slug, ac.name AS away_club_name, ac.short AS away_club_short, ac.color AS away_club_color, ac.logo_url AS away_club_logo_url,
            d.name AS div_name, d.level AS div_level
     FROM matches m
     JOIN teams h ON h.id = m.home_id
     JOIN clubs hc ON hc.id = h.club_id
     JOIN teams a ON a.id = m.away_id
     JOIN clubs ac ON ac.id = a.club_id
     JOIN divisions d ON d.id = m.division_id
     WHERE m.season_id = $1 AND (hc.id = $2 OR ac.id = $2)
  `;
  const params: any[] = [seasonId, clubId];
  if (divisionId) {
    sql += ` AND m.division_id = $${params.length + 1}`;
    params.push(divisionId);
  }
  sql += ` ORDER BY m.kickoff DESC, m.id`;
  const { rows } = await pool.query<MatchRow>(sql, params);
  return rows.map((r) => ({
    id: r.id, season_id: r.season_id, division_id: r.division_id, round: r.round, kickoff: r.kickoff.toISOString(),
    status: r.status, period: r.period, minute: r.minute,
    home_q1: r.home_q1, away_q1: r.away_q1,
    home_q2: r.home_q2, away_q2: r.away_q2,
    home_q3: r.home_q3, away_q3: r.away_q3,
    home_q4: r.home_q4, away_q4: r.away_q4,
    home_gg: r.home_gg, away_gg: r.away_gg,
    home_goals: r.home_goals, away_goals: r.away_goals,
    homeGoals: r.home_goals, awayGoals: r.away_goals,
    result_type: r.result_type,
    home: ref(r.home_slug, r.home_name, r.home_short, r.home_color, {
      id: r.home_club_id, slug: r.home_club_slug, name: r.home_club_name, short: r.home_club_short, color: r.home_club_color,
      logo_url: r.home_club_logo_url ?? undefined,
    }),
    away: ref(r.away_slug, r.away_name, r.away_short, r.away_color, {
      id: r.away_club_id, slug: r.away_club_slug, name: r.away_club_name, short: r.away_club_short, color: r.away_club_color,
      logo_url: r.away_club_logo_url ?? undefined,
    }),
    video_url: r.video_url ?? null,
    division: { id: r.division_id, season_id: r.season_id, name: r.div_name, level: r.div_level },
  }));
}

export async function getClubs(): Promise<Club[]> {
  const { rows } = await pool.query<Club>("SELECT id, slug, name, short, color, logo_url, founded, coach FROM clubs ORDER BY name");
  return rows;
}

export async function getClubBySlug(slug: string): Promise<Club | null> {
  const { rows } = await pool.query<Club>("SELECT id, slug, name, short, color, logo_url, founded, coach FROM clubs WHERE slug = $1", [slug]);
  return rows[0] ?? null;
}

export async function getClubById(id: number): Promise<Club | null> {
  const { rows } = await pool.query<Club>("SELECT id, slug, name, short, color, logo_url, founded, coach FROM clubs WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getClubWithTeams(clubId: number, seasonId: number): Promise<ClubWithTeams | null> {
  const club = await getClubById(clubId);
  if (!club) return null;
  
  const { rows } = await pool.query<Team>(
    `SELECT t.id, t.slug, t.name, t.short, t.color, t.club_id, t.division_id
     FROM teams t
     WHERE t.club_id = $1 AND t.division_id IN (SELECT id FROM divisions WHERE season_id = $2)
     ORDER BY t.division_id, t.name`,
    [clubId, seasonId]
  );
  return { ...club, teams: rows };
}

export async function getTeams(seasonId: number, divisionId?: number): Promise<Team[]> {
  let sql = `
    SELECT t.id, t.slug, t.name, t.short, t.color, t.club_id, t.division_id
    FROM teams t
    JOIN divisions d ON d.id = t.division_id
    WHERE d.season_id = $1
  `;
  const params: any[] = [seasonId];
  if (divisionId) {
    sql += ` AND t.division_id = $2`;
    params.push(divisionId);
  }
  sql += ` ORDER BY d.level, t.name`;
  
  const { rows } = await pool.query<Team>(sql, params);
  return rows;
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const { rows } = await pool.query<Team>(
    `SELECT t.id, t.slug, t.name, t.short, t.color, t.club_id, t.division_id
     FROM teams t WHERE t.slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function getTeamTrend(seasonId: number, divisionId: number, teamId: number): Promise<TrendPoint[]> {
  const { rows } = await pool.query<{ round: number; gf: number; ga: number; points: number }>(
    `SELECT m.round,
            CASE WHEN m.home_id = $3 THEN m.home_goals ELSE m.away_goals END AS gf,
            CASE WHEN m.home_id = $3 THEN m.away_goals ELSE m.home_goals END AS ga,
            CASE 
              WHEN (m.home_id = $3 AND m.home_goals > m.away_goals AND m.result_type = 'win') THEN 3
              WHEN (m.away_id = $3 AND m.away_goals > m.home_goals AND m.result_type = 'win') THEN 3
              WHEN (m.home_id = $3 AND m.home_goals > m.away_goals AND m.result_type = 'gg_win') THEN 2
              WHEN (m.away_id = $3 AND m.away_goals > m.home_goals AND m.result_type = 'gg_win') THEN 2
              WHEN (m.home_id = $3 AND m.home_goals < m.away_goals AND m.result_type = 'gg_loss') THEN 1
              WHEN (m.away_id = $3 AND m.away_goals < m.home_goals AND m.result_type = 'gg_loss') THEN 1
              WHEN (m.home_goals = m.away_goals AND m.result_type = 'draw') THEN 1
              ELSE 0
            END AS points
     FROM matches m
     WHERE m.season_id = $1 AND m.division_id = $2 AND m.status = 'finished' AND not m.is_finals AND (m.home_id = $3 OR m.away_id = $3)
     ORDER BY m.round`,
    [seasonId, divisionId, teamId],
  );
  
  let points = 0, gf = 0, ga = 0;
  return rows.map((r) => {
    points += r.points;
    gf += r.gf || 0;
    ga += r.ga || 0;
    return { round: r.round, points, gf, ga };
  });
}

export async function getSquad(teamId: number): Promise<SquadPlayer[]> {
  const { rows } = await pool.query<SquadPlayer>(
    `SELECT p.id, p.name, p.gender, p.shirt,
            COUNT(s.match_id)::int AS apps,
            COALESCE(SUM(s.minutes), 0)::int AS minutes,
            COALESCE(SUM(s.goals), 0)::int AS goals,
            COALESCE(SUM(s.assists), 0)::int AS assists,
            COALESCE(SUM(s.rebounds), 0)::int AS rebounds,
            COALESCE(SUM(s.steals), 0)::int AS steals,
            COALESCE(SUM(s.turnovers), 0)::int AS turnovers,
            COALESCE(SUM(s.penalties), 0)::int AS penalties
     FROM players p LEFT JOIN player_stats s ON s.player_id = p.id
     WHERE p.team_id = $1
     GROUP BY p.id
     ORDER BY goals DESC, assists DESC, rebounds DESC, p.shirt`,
    [teamId],
  );
  return rows;
}

export async function getLeaguePlayers(seasonId: number, divisionId?: number): Promise<LeaguePlayer[]> {
  let sql = `
    SELECT p.id, p.name, p.gender, t.short AS team, t.color,
            SUM(s.goals)::int AS goals, SUM(s.assists)::int AS assists,
            SUM(s.rebounds)::int AS rebounds, SUM(s.steals)::int AS steals,
            SUM(s.turnovers)::int AS turnovers, SUM(s.penalties)::int AS penalties,
            SUM(s.minutes)::int AS minutes
     FROM player_stats s
     JOIN players p ON p.id = s.player_id
     JOIN teams t ON t.id = p.team_id
     JOIN matches m ON m.id = s.match_id
     WHERE m.season_id = $1
  `;
  const params: any[] = [seasonId];
  if (divisionId) {
    sql += ` AND m.division_id = $2`;
    params.push(divisionId);
  }
  sql += ` GROUP BY p.id, t.short, t.color ORDER BY goals DESC, assists DESC, rebounds DESC LIMIT 150`;
  
  const { rows } = await pool.query<LeaguePlayer>(sql, params);
  return rows;
}

export async function getPlayer(id: number): Promise<Player | null> {
  const { rows } = await pool.query<Player>(
    `SELECT p.id, p.name, p.gender, p.shirt, t.slug, t.name AS team_name, t.short, t.color, t.id as team_id
     FROM players p JOIN teams t ON t.id = p.team_id WHERE p.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getPlayerMatches(playerId: number, seasonId: number): Promise<PlayerMatch[]> {
  const { rows } = await pool.query<PlayerMatch>(
    `SELECT m.round, opp.short AS opponent, (m.home_id = p.team_id) AS home,
            s.minutes, s.goals, s.assists, s.rebounds, s.steals, s.turnovers, s.penalties
     FROM player_stats s
     JOIN matches m ON m.id = s.match_id
     JOIN players p ON p.id = s.player_id
     JOIN teams opp ON opp.id = CASE WHEN m.home_id = p.team_id THEN m.away_id ELSE m.home_id END
     WHERE s.player_id = $1 AND m.season_id = $2
     ORDER BY m.round`,
    [playerId, seasonId],
  );
  return rows;
}

export interface DivisionAwards {
  maleMvp: string | null;
  femaleMvp: string | null;
  bestAttacker: string | null;
  bestDefender: string | null;
  maleTopScorer: string | null;
  femaleTopScorer: string | null;
  champion: string | null;
  resultsUrl: string | null;
}

// Compute all end-of-season awards for a single division from match results and player stats.
// Player-based awards are null when no player_stats exist for that division yet.
/** What has been typed into korfball-awards.csv for one division (all optional). */
type TypedAwards = {
  male_mvp: string | null;
  female_mvp: string | null;
  best_attacker: string | null;
  best_defender: string | null;
  male_top_scorer: string | null;
  female_top_scorer: string | null;
  champion: string | null;
};

const NO_AWARDS: TypedAwards = {
  male_mvp: null,
  female_mvp: null,
  best_attacker: null,
  best_defender: null,
  male_top_scorer: null,
  female_top_scorer: null,
  champion: null,
};

async function getTypedAwards(divisionId: number): Promise<TypedAwards> {
  try {
    const res = await pool.query<TypedAwards>(
      `SELECT male_mvp, female_mvp, best_attacker, best_defender,
              male_top_scorer, female_top_scorer, champion
       FROM division_awards
       WHERE division_id = $1`,
      [divisionId],
    );
    return res.rows[0] ?? NO_AWARDS;
  } catch (err) {
    // 42P01 = the table doesn't exist yet (migration / import not run): treat it as no awards entered
    if ((err as { code?: string }).code === "42P01") return NO_AWARDS;
    throw err;
  }
}

export async function getDivisionAwards(
  seasonId: number,
  divisionId: number,
): Promise<DivisionAwards> {
  // The MVPs, best attacker and best defender are voted on by coaches and referees, so they are never
  // calculated: they only ever show what has been entered in division_awards (korfball-awards.csv).
  const typed = await getTypedAwards(divisionId);

  // Champion: the winner of the Grand Final (round 17), and only once it has been played. A name entered
  // in division_awards takes priority (for seasons whose finals aren't in the match data).
  const finalRes = await pool.query<{ team_name: string }>(
    `SELECT CASE WHEN m.home_goals > m.away_goals THEN th.name ELSE ta.name END AS team_name
     FROM matches m
     JOIN teams th ON th.id = m.home_id
     JOIN teams ta ON ta.id = m.away_id
     WHERE m.season_id = $1 AND m.division_id = $2 AND m.round = 17
       AND m.status = 'finished' AND m.home_goals <> m.away_goals
     LIMIT 1`,
    [seasonId, divisionId],
  );

  // Top goal scorers are a plain statistic, so they are worked out from the player stats unless a name
  // was entered for the division. Players level on goals are all listed.
  const scorerRes = await pool.query<{ name: string; gender: "M" | "F"; goals: number }>(
    `SELECT p.name, p.gender, SUM(s.goals)::int AS goals
     FROM player_stats s
     JOIN players p ON p.id = s.player_id
     JOIN matches m ON m.id = s.match_id
     WHERE m.season_id = $1 AND m.division_id = $2
     GROUP BY p.id, p.name, p.gender`,
    [seasonId, divisionId],
  );

  const topScorers = (gender: "M" | "F") => {
    const eligible = scorerRes.rows.filter((p) => p.gender === gender && p.goals > 0);
    if (eligible.length === 0) return null;
    const best = Math.max(...eligible.map((p) => p.goals));
    return eligible
      .filter((p) => p.goals === best)
      .map((p) => p.name)
      .sort()
      .join(", ");
  };

  return {
    maleMvp: typed.male_mvp,
    femaleMvp: typed.female_mvp,
    bestAttacker: typed.best_attacker,
    bestDefender: typed.best_defender,
    maleTopScorer: typed.male_top_scorer ?? topScorers("M"),
    femaleTopScorer: typed.female_top_scorer ?? topScorers("F"),
    champion: typed.champion ?? finalRes.rows[0]?.team_name ?? null,
    // Results links to the matches page for this season/division.
    resultsUrl: `/matches?season=${seasonId}&division=${divisionId}`,
  };
}

export async function getHistoryRows(): Promise<HistoryRow[]> {
  const seasons = await getSeasons();

  const seasonPromises = seasons.map(async (season) => {
    const divisions = await getDivisions(season.id);
    const nonSocialDivisions = divisions.filter(
      (d) => !d.name.toLowerCase().includes("social"),
    );

    const divisionPromises = nonSocialDivisions.map(async (division) => {
      const awards = await getDivisionAwards(season.id, division.id);
      return {
        seasonId: season.id,
        seasonName: season.name,
        divisionId: division.id,
        divisionName: division.name,
        ...awards,
      } as HistoryRow;
    });

    return Promise.all(divisionPromises);
  });

  const seasonResults = await Promise.all(seasonPromises);
  return seasonResults.flat();
}

export async function getPlayerCareerMatches(playerId: number): Promise<PlayerCareerMatch[]> {
  const { rows } = await pool.query<PlayerCareerMatch>(
    `SELECT m.round, opp.short AS opponent, (m.home_id = p.team_id) AS home,
            s.minutes, s.goals, s.assists, s.rebounds, s.steals, s.turnovers, s.penalties,
            m.season_id, sn.name AS season_name, d.name AS division_name, t.name AS team_name
     FROM player_stats s
     JOIN matches m ON m.id = s.match_id
     JOIN players p ON p.id = s.player_id
     JOIN teams opp ON opp.id = CASE WHEN m.home_id = p.team_id THEN m.away_id ELSE m.home_id END
     JOIN teams t ON t.id = p.team_id
     JOIN seasons sn ON sn.id = m.season_id
     JOIN divisions d ON d.id = m.division_id
     WHERE s.player_id = $1
     ORDER BY sn.name DESC, m.round`,
    [playerId],
  );
  return rows;
}

export async function getPlayerSeasonStats(playerId: number): Promise<SeasonStats[]> {
  const { rows } = await pool.query<SeasonStats>(
    `SELECT m.season_id, sn.name AS season_name, d.name AS division_name, t.name AS team_name,
            COUNT(*)::int AS games,
            COALESCE(SUM(s.minutes), 0)::int AS minutes,
            COALESCE(SUM(s.goals), 0)::int AS goals,
            COALESCE(SUM(s.assists), 0)::int AS assists,
            COALESCE(SUM(s.rebounds), 0)::int AS rebounds,
            COALESCE(SUM(s.steals), 0)::int AS steals,
            COALESCE(SUM(s.turnovers), 0)::int AS turnovers,
            COALESCE(SUM(s.penalties), 0)::int AS penalties
     FROM player_stats s
     JOIN matches m ON m.id = s.match_id
     JOIN players p ON p.id = s.player_id
     JOIN teams t ON t.id = p.team_id
     JOIN seasons sn ON sn.id = m.season_id
     JOIN divisions d ON d.id = m.division_id
     WHERE s.player_id = $1
     GROUP BY m.season_id, sn.name, d.name, t.name
     ORDER BY sn.name DESC`,
    [playerId],
  );
  return rows;
}