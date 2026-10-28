// Korfball SA types

export type Gender = "M" | "F";

export interface ClubRef { 
  id: number; 
  slug: string; 
  name: string; 
  short: string; 
  color: string; 
  logo_url?: string;
  founded?: string;
  coach?: string;
}
export interface Club extends ClubRef {}

export interface DivisionRef { id: number; season_id: number; name: string; level: number }
export interface Division extends DivisionRef {}

export interface TeamRef { slug: string; name: string; short: string; color: string; club?: ClubRef }
export interface Team extends TeamRef { 
  id: number; 
  club_id: number; 
  division_id: number;
  club?: Club;
}

export interface SeasonRef { id: number; name: string; is_current: boolean }
export interface Season extends SeasonRef {}

export interface Match {
  id: number;
  season_id: number;
  division_id: number;
  round: number;
  kickoff: string; // ISO
  status: "scheduled" | "live" | "finished";
  period: number | null; // 1-4 = quarters, 5 = golden goal
  minute: number | null; // minute within period (0-10)
  // Quarter scores
  home_q1: number | null; away_q1: number | null;
  home_q2: number | null; away_q2: number | null;
  home_q3: number | null; away_q3: number | null;
  home_q4: number | null; away_q4: number | null;
  // Golden goal (only present if match went to golden goal)
  home_gg: number | null; away_gg: number | null;
  // Totals
  home_goals: number | null;
  away_goals: number | null;
  homeGoals: number | null; // alias for compatibility
  awayGoals: number | null; // alias for compatibility
  // Result type for points: win=3, gg_win=2, gg_loss=1, draw=1, loss=0
  result_type: "win" | "gg_win" | "gg_loss" | "draw" | "loss" | null;
  home: TeamRef;
  away: TeamRef;
  division?: DivisionRef;
  video_url?: string | null;
}

export interface StandingRow extends Team {
  played: number; won: number; drawn: number; gg_won: number; gg_lost: number; lost: number;
  gf: number; ga: number; gd: number; points: number;
  club_logo_url?: string | null;
}

export interface SquadPlayer {
  id: number; name: string; gender: Gender; shirt: number;
  apps: number; minutes: number; 
  goals: number; assists: number; rebounds: number; steals: number; turnovers: number; penalties: number;
}

export interface LeaguePlayer {
  id: number; name: string; gender: Gender; team: string; color: string;
  goals: number; assists: number; rebounds: number; steals: number; turnovers: number; penalties: number; minutes: number;
}

export interface TrendPoint { round: number; points: number; gf: number; ga: number }

export interface PlayerMatch {
  round: number; opponent: string; home: boolean;
  minutes: number; goals: number; assists: number; rebounds: number; steals: number; turnovers: number; penalties: number;
}

export interface ClubWithTeams extends Club {
  teams: Team[];
}