import { useState, useEffect, useCallback } from 'react';
import { LogOut, Plus, Settings, Bell } from 'lucide-react';
import { useApp } from '@/lib/context';
import { getClubsForPlayer, getPendingCountForPlayer, getMyRole } from '@/lib/localDb';
import type { Club } from '@/lib/types';

export function HomeScreen() {
  const { player, signOut, setActiveClubId, setScreen, setPendingClubId } = useApp();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchClubs = useCallback(() => {
    if (!player) {
      setClubs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const playerClubs = getClubsForPlayer(player.id);
    setClubs(playerClubs);
    setPendingCount(getPendingCountForPlayer(player.id));
    setLoading(false);
  }, [player]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const handleClubClick = (club: Club) => {
    setActiveClubId(club.id);
    setScreen('inside-club');
  };

  const handleCreateClub = () => {
    setScreen('club-management');
  };

  const handleNotificationClick = () => {
    if (!player || clubs.length === 0) return;
    for (const club of clubs) {
      const role = getMyRole(club.id, player.id);
      if (role === 'chairman' || role === 'admin' || role === 'accountant') {
        setPendingClubId(club.id);
        setScreen('club-management');
        return;
      }
    }
  };

  const visibleClubs = clubs.slice(0, 9);

  return (
    <div className="mobile-frame bg-ink-900 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-[calc(var(--safe-top)+20px)] pb-2 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/40 font-medium">Welcome back</p>
          <h1 className="text-2xl font-extrabold text-white">Hello, {player?.nickname || 'Player'}!</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center active:scale-90 transition-all">
            <Settings size={18} className="text-white/50" />
          </button>
          <div className="relative">
            <button
              onClick={handleNotificationClick}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center active:scale-90 transition-all"
            >
              <Bell size={18} className="text-white/50" />
            </button>
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 z-50 bg-[#CCFF00] text-[#0D2E27] text-[10px] font-bold min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full border border-[#0D2E27] shadow-md animate-scale-in">
                {pendingCount}
              </span>
            )}
          </div>
          <button
            onClick={signOut}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center active:scale-90 transition-all"
          >
            <LogOut size={18} className="text-white/50" />
          </button>
        </div>
      </div>

      {/* Avatar */}
      <div className="px-6 pt-2 pb-4 flex items-center gap-3">
        <div className="relative">
          {player?.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.nickname}
              className="w-12 h-12 rounded-full object-cover border-2 border-lime-400/20"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-ink-600 flex items-center justify-center border-2 border-lime-400/20">
              <span className="text-lg font-bold text-lime-400/70">
                {(player?.nickname || '?')[0]?.toUpperCase()}
              </span>
            </div>
          )}
          {player?.player_code && (
            <span className="id-badge id-badge-sm">
              {player.player_code}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{player?.full_name || 'Player'}</p>
          <p className="text-xs text-white/40">{player?.handedness} · {player?.racket_model || 'No racket'}</p>
        </div>
      </div>

      {/* Center club grid */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full text-center mb-6">
          <h2 className="text-lg font-bold text-white">Your Clubs</h2>
          <p className="text-xs text-white/30 mt-1">
            {clubs.length} {clubs.length === 1 ? 'club' : 'clubs'} · Tap to enter
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="inline-block w-6 h-6 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
          </div>
        ) : visibleClubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/8 flex items-center justify-center mb-4">
              <Plus size={32} className="text-white/20" />
            </div>
            <p className="text-sm text-white/40 font-medium">No clubs yet</p>
            <p className="text-xs text-white/20 mt-1 mb-4">Create your first tennis club</p>
            <button onClick={handleCreateClub} className="btn-primary !w-auto px-6">
              <Plus size={18} />
              Create Club
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 w-full max-w-[340px] mx-auto">
            {visibleClubs.map((club, idx) => (
              <button
                key={club.id}
                onClick={() => handleClubClick(club)}
                className="flex flex-col items-center gap-2 animate-scale-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="relative inline-block w-20 h-20">
                  <div className="w-full h-full rounded-full overflow-hidden bg-ink-700 border-2 border-white/10 active:scale-90 active:border-lime-400/40 transition-all">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl font-extrabold text-lime-400/40">
                          {club.name[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="absolute -top-1 -right-1 z-50 bg-[#CCFF00] text-[#0D2E27] text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[32px] text-center shadow-md">
                    {club.club_code}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-white/60 text-center truncate w-full">
                  {club.name}
                </span>
              </button>
            ))}

            {/* Add club button if < 9 */}
            {visibleClubs.length < 9 && (
              <button
                onClick={handleCreateClub}
                className="flex flex-col items-center gap-2 animate-scale-in"
                style={{ animationDelay: `${visibleClubs.length * 50}ms` }}
              >
                <div className="w-full aspect-square rounded-full border-2 border-dashed border-lime-400/20 flex items-center justify-center active:scale-90 active:border-lime-400/50 transition-all">
                  <Plus size={24} className="text-lime-400/40" />
                </div>
                <span className="text-[10px] font-medium text-lime-400/50">New Club</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-6 pb-[calc(var(--safe-bottom)+16px)] text-center">
        <p className="text-[10px] font-mono text-white/20">
          1-SET · HARD-COURT SYSTEM
        </p>
      </div>
    </div>
  );
}
