import type { Club, ClubMember, MatchRecord, Player, MemberRole, MemberStatus, ScheduleDay, TeamMatchSet, PlayerRanking } from './types';
import { DEFAULT_LOGO, DEFAULT_COVER } from './defaultImages';

const KEYS = {
  players: 'trr_players',
  clubs: 'trr_clubs',
  members: 'trr_members',
  matches: 'trr_matches',
  teamMatches: 'trr_team_matches',
  session: 'trr_session',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[localDb] Failed to write "${key}":`, err);
    throw new Error(
      err instanceof Error
        ? `Storage write failed: ${err.message}`
        : 'Storage write failed (unknown cause)'
    );
  }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function downscaleImage(dataUrl: string, maxSize: number = 128): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ---- Players ----

export function getPlayers(): Player[] {
  return read<Player[]>(KEYS.players, []);
}

export function getPlayerById(id: string): Player | null {
  return getPlayers().find((p) => p.id === id) || null;
}

export function getPlayerByEmail(email: string): Player | null {
  return getPlayers().find((p) => p.email === email) || null;
}

export function savePlayer(player: Player): void {
  const players = getPlayers();
  const idx = players.findIndex((p) => p.id === player.id);
  if (idx >= 0) {
    players[idx] = player;
  } else {
    players.push(player);
  }
  write(KEYS.players, players);
}

export function createPlayer(data: {
  email: string;
  password: string;
  fullName?: string;
  nickname?: string;
}): Player {
  const existing = getPlayerByEmail(data.email);
  if (existing) throw new Error('An account with this email already exists');

  const player: Player = {
    id: uid(),
    user_id: uid(),
    player_code: generateUniquePlayerCode(),
    full_name: data.fullName || '',
    nickname: data.nickname || '',
    dob: null,
    handedness: 'Right',
    racket_model: '',
    shoe_size: '',
    avatar_url: '',
    email: data.email,
    onboarding_complete: false,
    created_at: new Date().toISOString(),
  };
  savePlayer(player);

  const creds = read<Record<string, string>>('trr_credentials', {});
  creds[data.email] = data.password;
  write('trr_credentials', creds);

  return player;
}

export function authenticatePlayer(email: string, password: string): Player {
  const player = getPlayerByEmail(email);
  if (!player) throw new Error('No account found with this email. Please register first.');
  const creds = read<Record<string, string>>('trr_credentials', {});
  if (creds[email] !== password) throw new Error('Incorrect password. Please try again.');
  return player;
}

// ---- Session ----

export function getSessionPlayerId(): string | null {
  return read<string | null>(KEYS.session, null);
}

export function setSession(playerId: string): void {
  write(KEYS.session, playerId);
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEYS.session);
  } catch {
    /* noop */
  }
}

export function getCurrentPlayer(): Player | null {
  const id = getSessionPlayerId();
  if (!id) return null;
  return getPlayerById(id);
}

// ---- Clubs ----

export function getClubs(): Club[] {
  return read<Club[]>(KEYS.clubs, []);
}

export function getClubById(id: string): Club | null {
  return getClubs().find((c) => c.id === id) || null;
}

export function getClubByCode(code: string): Club | null {
  return getClubs().find((c) => c.club_code === code) || null;
}

function generateUniqueClubCode(): string {
  const clubs = getClubs();
  const existing = new Set(clubs.map((c) => c.club_code));
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (existing.has(code));
  return code;
}

function generateUniquePlayerCode(): string {
  const players = getPlayers();
  const existing = new Set(players.map((p) => p.player_code));
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (existing.has(code));
  return code;
}

export function ensurePlayerCode(player: Player): Player {
  if (player.player_code) return player;
  const updated = { ...player, player_code: generateUniquePlayerCode() };
  savePlayer(updated);
  return updated;
}

export function getClubsForPlayer(playerId: string): Club[] {
  const members = getMembers().filter(
    (m) => m.user_id === playerId && m.status === 'active'
  );
  const clubIds = members.map((m) => m.club_id);
  return getClubs()
    .filter((c) => clubIds.includes(c.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function createDefaultScheduleDays(): ScheduleDay[] {
  return DAYS_OF_WEEK.map((day) => ({
    day,
    enabled: false,
    startTime: '18:00',
    endTime: '22:00',
  }));
}

export function scheduleDaysToText(days: ScheduleDay[]): string {
  const active = days.filter((d) => d.enabled);
  if (active.length === 0) return 'No schedule set';
  return active.map((d) => `${d.day} ${d.startTime}–${d.endTime}`).join(', ');
}

export function validateTimeRange(start: string, end: string): string | null {
  const minTime = '05:00';
  const maxTime = '23:00';
  if (start < minTime) return 'Start time cannot be earlier than 05:00';
  if (end > maxTime) return 'End time cannot be later than 23:00';
  if (start >= end) return 'End time must be after start time';
  return null;
}

export function getTodaySchedule(days: ScheduleDay[] | null): ScheduleDay | null {
  if (!days) return null;
  const jsDay = new Date().getDay();
  const dayMap: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
  const todayName = dayMap[jsDay];
  return days.find((d) => d.day === todayName && d.enabled) || null;
}

export function createClub(data: {
  name: string;
  foundationDate: string | null;
  bio: string;
  schedule: string;
  scheduleDays: ScheduleDay[];
  coverUrl: string;
  logoUrl: string;
  creatorId: string;
  creatorName: string;
}): Club {
  const club: Club = {
    id: uid(),
    club_code: generateUniqueClubCode(),
    name: data.name,
    foundation_date: data.foundationDate,
    bio: data.bio,
    schedule: data.schedule,
    schedule_days: data.scheduleDays,
    cover_url: data.coverUrl || DEFAULT_COVER,
    logo_url: data.logoUrl || DEFAULT_LOGO,
    gps_lat: 37.7749,
    gps_lng: -122.4194,
    creator_id: data.creatorId,
    created_at: new Date().toISOString(),
  };

  const clubs = getClubs();
  clubs.push(club);
  write(KEYS.clubs, clubs);

  const member: ClubMember = {
    id: uid(),
    club_id: club.id,
    user_id: data.creatorId,
    role: 'chairman',
    status: 'active',
    player_name: data.creatorName,
    joined_at: new Date().toISOString(),
  };
  const members = getMembers();
  members.push(member);
  write(KEYS.members, members);

  return club;
}

// ---- Members ----

export function getMembers(): ClubMember[] {
  return read<ClubMember[]>(KEYS.members, []);
}

export function getMembersByClub(clubId: string): ClubMember[] {
  return getMembers()
    .filter((m) => m.club_id === clubId)
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
}

export function getActiveMembersByClub(clubId: string): ClubMember[] {
  return getMembersByClub(clubId).filter((m) => m.status === 'active');
}

export function getPendingCountForClub(clubId: string): number {
  return getMembers().filter((m) => m.club_id === clubId && m.status === 'pending').length;
}

export function getPendingCountForPlayer(playerId: string): number {
  const playerClubs = getClubsForPlayer(playerId);
  let total = 0;
  for (const club of playerClubs) {
    const member = getMembers().find(
      (m) => m.club_id === club.id && m.user_id === playerId && m.status === 'active'
    );
    if (member && (member.role === 'chairman' || member.role === 'admin' || member.role === 'accountant')) {
      total += getPendingCountForClub(club.id);
    }
  }
  return total;
}

export function updateMember(id: string, updates: Partial<ClubMember>): void {
  const members = getMembers();
  const idx = members.findIndex((m) => m.id === id);
  if (idx >= 0) {
    members[idx] = { ...members[idx], ...updates };
    write(KEYS.members, members);
  }
}

export function deleteMember(id: string): void {
  const members = getMembers().filter((m) => m.id !== id);
  write(KEYS.members, members);
}

export function getMyRole(clubId: string, playerId: string): MemberRole | null {
  const member = getMembers().find(
    (m) => m.club_id === clubId && m.user_id === playerId && m.status === 'active'
  );
  return member?.role || null;
}

export function requestJoinClub(clubId: string, playerId: string, playerName: string): void {
  const existing = getMembers().find(
    (m) => m.club_id === clubId && m.user_id === playerId
  );
  if (existing) return;
  const member: ClubMember = {
    id: uid(),
    club_id: clubId,
    user_id: playerId,
    role: 'member',
    status: 'pending',
    player_name: playerName,
    joined_at: new Date().toISOString(),
  };
  const members = getMembers();
  members.push(member);
  write(KEYS.members, members);
}

// ---- Matches (legacy 1v1) ----

export function getMatches(): MatchRecord[] {
  return read<MatchRecord[]>(KEYS.matches, []);
}

export function getMatchesByClub(clubId: string): MatchRecord[] {
  return getMatches()
    .filter((m) => m.club_id === clubId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function createMatch(data: {
  clubId: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Games: number;
  player2Games: number;
  winnerId: string;
  winnerName: string;
  recordedBy: string;
}): MatchRecord {
  const match: MatchRecord = {
    id: uid(),
    club_id: data.clubId,
    player1_id: data.player1Id,
    player2_id: data.player2Id,
    player1_name: data.player1Name,
    player2_name: data.player2Name,
    player1_games: data.player1Games,
    player2_games: data.player2Games,
    winner_id: data.winnerId,
    winner_name: data.winnerName,
    court_type: 'hard',
    set_format: '1-set',
    recorded_by: data.recordedBy,
    created_at: new Date().toISOString(),
  };
  const matches = getMatches();
  matches.push(match);
  write(KEYS.matches, matches);
  return match;
}

export function deleteMatch(id: string): void {
  const matches = getMatches().filter((m) => m.id !== id);
  write(KEYS.matches, matches);
}

// ---- Team Match Sets (live score) ----

export function getTeamMatches(): TeamMatchSet[] {
  return read<TeamMatchSet[]>(KEYS.teamMatches, []);
}

export function getTeamMatchesByClub(clubId: string): TeamMatchSet[] {
  return getTeamMatches()
    .filter((m) => m.club_id === clubId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function saveTeamMatchSet(data: {
  clubId: string;
  setIndex: number;
  team1PlayerAId: string;
  team1PlayerAName: string;
  team1PlayerBId: string;
  team1PlayerBName: string;
  team2PlayerCId: string;
  team2PlayerCName: string;
  team2PlayerDId: string;
  team2PlayerDName: string;
  team1Score: number;
  team2Score: number;
  recordedBy: string | null;
}): TeamMatchSet {
  const winnerSide: 'team1' | 'team2' = data.team1Score > data.team2Score ? 'team1' : 'team2';
  const set: TeamMatchSet = {
    id: uid(),
    club_id: data.clubId,
    set_index: data.setIndex,
    team1_playerA_id: data.team1PlayerAId,
    team1_playerA_name: data.team1PlayerAName,
    team1_playerB_id: data.team1PlayerBId,
    team1_playerB_name: data.team1PlayerBName,
    team2_playerC_id: data.team2PlayerCId,
    team2_playerC_name: data.team2PlayerCName,
    team2_playerD_id: data.team2PlayerDId,
    team2_playerD_name: data.team2PlayerDName,
    team1_score: data.team1Score,
    team2_score: data.team2Score,
    winner_side: winnerSide,
    recorded_by: data.recordedBy,
    created_at: new Date().toISOString(),
  };
  const all = getTeamMatches();
  all.push(set);
  write(KEYS.teamMatches, all);
  return set;
}

export function saveTeamMatchBatch(sets: Omit<TeamMatchSet, 'id' | 'created_at'>[]): void {
  const all = getTeamMatches();
  for (const s of sets) {
    all.push({ ...s, id: uid(), created_at: new Date().toISOString() });
  }
  write(KEYS.teamMatches, all);
}

// ---- Quarterly Rankings ----

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export function getQuarterlyRanking(clubId: string): PlayerRanking[] {
  const cutoff = Date.now() - THREE_MONTHS_MS;
  const teamMatches = getTeamMatchesByClub(clubId).filter(
    (m) => new Date(m.created_at).getTime() >= cutoff
  );
  const legacyMatches = getMatchesByClub(clubId).filter(
    (m) => new Date(m.created_at).getTime() >= cutoff
  );

  const stats: Record<string, PlayerRanking> = {};

  const ensure = (playerId: string, name: string) => {
    if (!stats[playerId]) {
      const p = getPlayerById(playerId);
      stats[playerId] = {
        playerId,
        name,
        avatarUrl: p?.avatar_url || '',
        wins: 0,
        losses: 0,
        total: 0,
        winPct: 0,
        gamesFor: 0,
        gamesAgainst: 0,
      };
    }
  };

  const recordWin = (playerId: string) => { stats[playerId].wins++; stats[playerId].total++; };
  const recordLoss = (playerId: string) => { stats[playerId].losses++; stats[playerId].total++; };

  for (const m of teamMatches) {
    const team1Ids = [m.team1_playerA_id, m.team1_playerB_id].filter(Boolean) as string[];
    const team2Ids = [m.team2_playerC_id, m.team2_playerD_id].filter(Boolean) as string[];

    for (const id of team1Ids) { ensure(id, m.team1_playerA_name); recordWin(id); }
    for (const id of team2Ids) { ensure(id, m.team2_playerC_name); recordLoss(id); }
  }

  for (const m of legacyMatches) {
    if (!m.winner_id) continue;
    const p1Key = m.player1_id || m.player1_name;
    const p2Key = m.player2_id || m.player2_name;
    ensure(p1Key, m.player1_name);
    ensure(p2Key, m.player2_name);
    if (m.winner_id === m.player1_id) {
      recordWin(p1Key);
      recordLoss(p2Key);
    } else {
      recordWin(p2Key);
      recordLoss(p1Key);
    }
  }

  const rankings = Object.values(stats);
  for (const r of rankings) {
    r.winPct = r.total > 0 ? Math.round((r.wins / r.total) * 1000) / 10 : 0;
  }
  return rankings.sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
}

// ---- Club deletion / leaving ----

export function deleteClub(clubId: string): void {
  const clubs = getClubs().filter((c) => c.id !== clubId);
  write(KEYS.clubs, clubs);

  const members = getMembers().filter((m) => m.club_id !== clubId);
  write(KEYS.members, members);

  const matches = getMatches().filter((m) => m.club_id !== clubId);
  write(KEYS.matches, matches);

  const teamMatches = getTeamMatches().filter((m) => m.club_id !== clubId);
  write(KEYS.teamMatches, teamMatches);
}

export function leaveClub(clubId: string, playerId: string): void {
  const members = getMembers();
  const leavingMember = members.find(
    (m) => m.club_id === clubId && m.user_id === playerId
  );
  if (!leavingMember) return;

  if (leavingMember.role === 'chairman') {
    const admins = members
      .filter((m) => m.club_id === clubId && m.user_id !== playerId && m.status === 'active' && m.role === 'admin')
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

    if (admins.length > 0) {
      const idx = members.findIndex((m) => m.id === admins[0].id);
      members[idx] = { ...members[idx], role: 'chairman' };
    } else {
      const accountants = members
        .filter((m) => m.club_id === clubId && m.user_id !== playerId && m.status === 'active' && m.role === 'accountant')
        .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

      if (accountants.length > 0) {
        const idx = members.findIndex((m) => m.id === accountants[0].id);
        members[idx] = { ...members[idx], role: 'chairman' };
      } else {
        const regularMembers = members
          .filter((m) => m.club_id === clubId && m.user_id !== playerId && m.status === 'active' && m.role === 'member')
          .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

        if (regularMembers.length > 0) {
          const idx = members.findIndex((m) => m.id === regularMembers[0].id);
          members[idx] = { ...members[idx], role: 'chairman' };
        }
      }
    }
  }

  const remaining = members.filter((m) => m.id !== leavingMember.id);
  write(KEYS.members, remaining);
}

// ---- Permission helpers ----

export function canManageMembers(role: MemberRole | null): boolean {
  return role === 'chairman' || role === 'admin' || role === 'accountant';
}

export function canRecordMatches(role: MemberRole | null): boolean {
  return role !== null;
}

export function canDeleteClub(role: MemberRole | null): boolean {
  return role === 'chairman';
}

export function canManageClubSettings(role: MemberRole | null): boolean {
  return role === 'chairman';
}

export function canViewNotifications(role: MemberRole | null): boolean {
  return role === 'chairman' || role === 'admin' || role === 'accountant';
}

export function clearAllData(): void {
  Object.values(KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  });
  try {
    localStorage.removeItem('trr_credentials');
  } catch {
    /* noop */
  }
}
