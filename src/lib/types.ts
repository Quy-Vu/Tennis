export type Handedness = 'Left' | 'Right';
export type MemberRole = 'chairman' | 'admin' | 'accountant' | 'member';
export type MemberStatus = 'pending' | 'active';

export interface Player {
  id: string;
  user_id: string;
  player_code: string;
  full_name: string;
  nickname: string;
  dob: string | null;
  handedness: string;
  racket_model: string;
  shoe_size: string;
  avatar_url: string;
  email: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

export interface ScheduleDay {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface Club {
  id: string;
  club_code: string;
  name: string;
  foundation_date: string | null;
  bio: string;
  schedule: string;
  schedule_days: ScheduleDay[] | null;
  cover_url: string;
  logo_url: string;
  gps_lat: number;
  gps_lng: number;
  creator_id: string;
  created_at: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  player_name: string;
  joined_at: string;
}

export interface MatchRecord {
  id: string;
  club_id: string;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string;
  player2_name: string;
  player1_games: number;
  player2_games: number;
  winner_id: string | null;
  winner_name: string;
  court_type: string;
  set_format: string;
  recorded_by: string | null;
  created_at: string;
}

export interface TeamMatchSet {
  id: string;
  club_id: string;
  set_index: number;
  team1_playerA_id: string;
  team1_playerA_name: string;
  team1_playerB_id: string;
  team1_playerB_name: string;
  team2_playerC_id: string;
  team2_playerC_name: string;
  team2_playerD_id: string;
  team2_playerD_name: string;
  team1_score: number;
  team2_score: number;
  winner_side: 'team1' | 'team2';
  recorded_by: string | null;
  created_at: string;
}

export interface PlayerRanking {
  playerId: string;
  name: string;
  avatarUrl: string;
  wins: number;
  losses: number;
  total: number;
  winPct: number;
  gamesFor: number;
  gamesAgainst: number;
}

export type ScreenName =
  | 'auth'
  | 'profile'
  | 'club-creation'
  | 'club-management'
  | 'home'
  | 'inside-club'
  | 'live-score';
