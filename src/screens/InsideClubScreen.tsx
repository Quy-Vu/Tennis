import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, MapPin, Calendar, Users, Trophy, Plus, X, Medal, LogOut, BarChart3, Clock } from 'lucide-react';
import { useApp } from '@/lib/context';
import {
  getClubById,
  getActiveMembersByClub,
  getMatchesByClub,
  getTeamMatchesByClub,
  getPlayers,
  getMyRole,
  leaveClub,
  canRecordMatches,
  getQuarterlyRanking,
  getTodaySchedule,
  scheduleDaysToText,
} from '@/lib/localDb';
import type { Club, ClubMember, MatchRecord, Player, MemberRole, TeamMatchSet, PlayerRanking } from '@/lib/types';

export function InsideClubScreen() {
  const { player, activeClubId, setActiveClubId, setScreen } = useApp();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teamMatches, setTeamMatches] = useState<TeamMatchSet[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myRole, setMyRole] = useState<MemberRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClubData = useCallback(() => {
    if (!activeClubId || !player) return;
    setLoading(true);

    setClub(getClubById(activeClubId));
    setMembers(getActiveMembersByClub(activeClubId));
    setMatches(getMatchesByClub(activeClubId));
    setTeamMatches(getTeamMatchesByClub(activeClubId));
    setPlayers(getPlayers());
    setMyRole(getMyRole(activeClubId, player.id));

    setLoading(false);
  }, [activeClubId, player]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  const handleBack = () => {
    setActiveClubId(null);
    setScreen('home');
  };

  const handleLeaveClub = () => {
    if (!activeClubId || !player) return;
    const confirmed = window.confirm(
      myRole === 'chairman'
        ? 'Bạn là Chủ tịch. Khi rời CLB, quyền Chủ tịch sẽ tự động được chuyển cho Admin hoạt động cao nhất. Bạn có chắc chắn muốn rời CLB?'
        : 'Bạn có chắc chắn muốn rời CLB này?'
    );
    if (!confirmed) return;
    leaveClub(activeClubId, player.id);
    setActiveClubId(null);
    setScreen('home');
  };

  const canRecordMatch = canRecordMatches(myRole);

  const handleStartLiveScore = () => {
    setScreen('live-score');
  };

  // Quarterly ranking
  const ranking = useMemo(() => {
    if (!activeClubId) return [] as PlayerRanking[];
    return getQuarterlyRanking(activeClubId);
  }, [activeClubId, teamMatches, matches]);

  const top3 = ranking.slice(0, 3);
  const barChartPlayers = ranking.slice(0, 8);
  const maxWinPct = barChartPlayers.length > 0 ? Math.max(...barChartPlayers.map((p) => p.winPct), 1) : 100;

  // Dynamic schedule
  const todaySchedule = club?.schedule_days ? getTodaySchedule(club.schedule_days) : null;
  const scheduleText = club?.schedule_days ? scheduleDaysToText(club.schedule_days) : club?.schedule || 'No schedule set';

  const roleBadge = (role: MemberRole) => {
    const cls =
      role === 'chairman' ? 'badge-chairman' :
      role === 'admin' ? 'badge-admin' :
      role === 'accountant' ? 'badge-accountant' :
      'badge-member';
    const label =
      role === 'chairman' ? 'Chủ tịch' :
      role === 'admin' ? 'Admin' :
      role === 'accountant' ? 'Kế toán' :
      'Thành viên';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${cls}`}>{label}</span>;
  };

  const getPlayerAvatar = (playerId: string, name: string) => {
    const p = players.find((pl) => pl.id === playerId);
    const url = p?.avatar_url;
    if (url) {
      return <img src={url} alt={name} className="w-full h-full object-cover" />;
    }
    return (
      <span className="text-lg font-bold text-lime-400/60">
        {(name || '?')[0]?.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="mobile-frame bg-ink-900 flex items-center justify-center">
        <span className="inline-block w-6 h-6 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mobile-frame bg-ink-900 flex flex-col">
      {/* Cover + header */}
      <div className="relative h-44 flex-shrink-0">
        {club?.cover_url ? (
          <img src={club.cover_url} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-ink-900" />

        <div className="absolute top-0 left-0 right-0 pt-[calc(var(--safe-top)+12px)] px-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-black/30 backdrop-blur flex items-center justify-center active:scale-90 transition-all"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
        </div>

        {/* Logo + name */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-3 flex items-end gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-ink-900 bg-ink-700 flex-shrink-0 -mb-1 shadow-lg">
            {club?.logo_url ? (
              <img src={club.logo_url} alt={club?.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl font-extrabold text-lime-400/50">
                  {club?.name[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-xl font-extrabold text-white">{club?.name}</h1>
            <p className="text-xs text-lime-400/70 font-mono font-bold">ID: {club?.club_code || '----'}</p>
          </div>
          {myRole && roleBadge(myRole)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 scroll-area px-6 pb-28 pt-4 space-y-5">
        {/* Club info */}
        <div className="glass-card p-4 space-y-3">
          {club?.bio && (
            <p className="text-sm text-white/60 leading-relaxed">{club.bio}</p>
          )}

          {/* Dynamic schedule */}
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Calendar size={14} className="text-lime-400/50" />
            <span>{scheduleText}</span>
          </div>
          {todaySchedule && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lime-400/8 border border-lime-400/15">
              <Clock size={14} className="text-lime-400" />
              <span className="text-xs text-lime-400 font-semibold">
                Today: {todaySchedule.day} {todaySchedule.startTime}–{todaySchedule.endTime}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-white/40">
            <MapPin size={14} className="text-lime-400/50" />
            <span className="font-mono">{club?.gps_lat.toFixed(4)}° N, {club?.gps_lng.toFixed(4)}° W</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Users size={14} className="text-lime-400/50" />
            <span>{members.length} active members</span>
          </div>
        </div>

        {/* Top 3 Podium */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-lime-400" />
            <h2 className="text-sm font-bold text-white">Club Rank — Top 3</h2>
            <span className="text-[9px] font-mono text-white/30 ml-auto">Quarterly (3 months)</span>
          </div>

          {top3.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <Medal size={32} className="text-white/15 mx-auto mb-2" />
              <p className="text-xs text-white/30">No matches recorded yet</p>
            </div>
          ) : (
            <div className="flex items-end justify-center gap-3 mb-4">
              {/* 2nd place */}
              {top3[1] && (
                <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '60ms' }}>
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 bg-ink-600 mb-1.5 shadow-md">
                    {getPlayerAvatar(top3[1].playerId, top3[1].name)}
                  </div>
                  <p className="text-[10px] font-semibold text-white/80 truncate max-w-[64px] text-center">{top3[1].name}</p>
                  <p className="text-[9px] font-bold text-white/50">Win: {top3[1].winPct}%</p>
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-sm font-extrabold text-white mt-1">2</div>
                </div>
              )}

              {/* 1st place */}
              {top3[0] && (
                <div className="flex flex-col items-center animate-scale-in">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-lime-400 bg-ink-600 mb-1.5 shadow-lg shadow-lime-400/20 relative">
                    {getPlayerAvatar(top3[0].playerId, top3[0].name)}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <Trophy size={14} className="text-lime-400" />
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-white truncate max-w-[72px] text-center">{top3[0].name}</p>
                  <p className="text-[10px] font-bold text-lime-400">Win: {top3[0].winPct}%</p>
                  <div className="w-10 h-10 rounded-lg bg-lime-400 flex items-center justify-center text-base font-extrabold text-ink-900 mt-1">1</div>
                </div>
              )}

              {/* 3rd place */}
              {top3[2] && (
                <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '120ms' }}>
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-clay-400/30 bg-ink-600 mb-1.5 shadow-md">
                    {getPlayerAvatar(top3[2].playerId, top3[2].name)}
                  </div>
                  <p className="text-[10px] font-semibold text-white/80 truncate max-w-[64px] text-center">{top3[2].name}</p>
                  <p className="text-[9px] font-bold text-white/50">Win: {top3[2].winPct}%</p>
                  <div className="w-8 h-8 rounded-lg bg-clay-400/20 flex items-center justify-center text-sm font-extrabold text-clay-400 mt-1">3</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quarterly Bar Chart */}
        {barChartPlayers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={18} className="text-lime-400/80" />
              <h2 className="text-sm font-bold text-white">Win % Analytics</h2>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-end justify-between gap-1.5 h-32">
                {barChartPlayers.map((p, idx) => {
                  const heightPct = (p.winPct / maxWinPct) * 100;
                  const isTop = idx === 0;
                  return (
                    <div key={p.playerId} className="flex flex-col items-center flex-1 min-w-0 group">
                      <span className="text-[8px] font-bold text-white/60 mb-1 truncate max-w-full">
                        {Math.round(p.winPct)}%
                      </span>
                      <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                        <div
                          className={`w-full max-w-[24px] rounded-t-md transition-all duration-500 ${
                            isTop
                              ? 'bg-gradient-to-t from-lime-400/60 to-lime-400'
                              : idx === 1
                              ? 'bg-gradient-to-t from-white/20 to-white/40'
                              : idx === 2
                              ? 'bg-gradient-to-t from-clay-400/20 to-clay-400/50'
                              : 'bg-gradient-to-t from-white/5 to-white/15'
                          }`}
                          style={{ height: `${Math.max(heightPct, 4)}%` }}
                        />
                      </div>
                      <span className="text-[7px] text-white/40 mt-1 truncate max-w-full text-center leading-tight">
                        {p.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                <span className="text-[9px] text-white/30 font-mono">Sets won / sets played</span>
                <span className="text-[9px] text-lime-400/50 font-mono">Last 90 days</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent team matches */}
        <div>
          <h2 className="text-sm font-bold text-white mb-3">Recent Matches</h2>
          {teamMatches.length === 0 && matches.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-xs text-white/30">No matches played yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teamMatches.slice(0, 8).map((m) => (
                <div key={m.id} className="glass-card p-3 animate-slide-up">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-white/30">
                      {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · Set {m.set_index}
                    </span>
                    <span className="text-[9px] font-mono text-lime-400/40 bg-lime-400/5 px-1.5 py-0.5 rounded">
                      Team Match
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-semibold flex-1 ${m.winner_side === 'team1' ? 'text-lime-400' : 'text-white/50'}`}>
                      {m.team1_playerA_name}
                      {m.team1_playerB_name && ` / ${m.team1_playerB_name}`}
                      {m.winner_side === 'team1' && <span className="text-[10px] ml-1">W</span>}
                    </div>
                    <div className="text-lg font-mono font-bold text-white px-3">
                      {m.team1_score} - {m.team2_score}
                    </div>
                    <div className={`text-xs font-semibold flex-1 text-right ${m.winner_side === 'team2' ? 'text-lime-400' : 'text-white/50'}`}>
                      {m.winner_side === 'team2' && <span className="text-[10px] mr-1">W</span>}
                      {m.team2_playerC_name}
                      {m.team2_playerD_name && ` / ${m.team2_playerD_name}`}
                    </div>
                  </div>
                </div>
              ))}
              {matches.slice(0, 4).map((m) => (
                <div key={m.id} className="glass-card p-3 animate-slide-up">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-white/30">
                      {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[9px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                      Legacy
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-semibold flex-1 ${m.winner_id === m.player1_id ? 'text-lime-400' : 'text-white/50'}`}>
                      {m.player1_name}
                      {m.winner_id === m.player1_id && <span className="text-[10px] ml-1">W</span>}
                    </div>
                    <div className="text-lg font-mono font-bold text-white px-3">
                      {m.player1_games} - {m.player2_games}
                    </div>
                    <div className={`text-sm font-semibold flex-1 text-right ${m.winner_id === m.player2_id ? 'text-lime-400' : 'text-white/50'}`}>
                      {m.winner_id === m.player2_id && <span className="text-[10px] mr-1">W</span>}
                      {m.player2_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-[calc(var(--safe-bottom)+16px)] pt-3 bg-gradient-to-t from-ink-900 via-ink-900 to-transparent space-y-2">
        {canRecordMatch && (
          <button onClick={handleStartLiveScore} className="btn-primary">
            <Trophy size={18} />
            Start Record LiveScore Today
          </button>
        )}
        {myRole && (
          <button
            onClick={handleLeaveClub}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold active:scale-95 transition-all"
          >
            <LogOut size={16} />
            Rời CLB
          </button>
        )}
      </div>
    </div>
  );
}
