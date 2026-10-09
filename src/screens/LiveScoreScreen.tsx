import { useState, useMemo } from 'react';
import { ArrowLeft, Check, Plus, X, Trophy, CircleCheck } from 'lucide-react';
import { useApp } from '@/lib/context';
import { getActiveMembersByClub, getClubById, saveTeamMatchBatch, getPlayerById } from '@/lib/localDb';
import type { ClubMember } from '@/lib/types';

interface SetRow {
  team1A: string;
  team1B: string;
  team2C: string;
  team2D: string;
  score1: number;
  score2: number;
  saved: boolean;
}

const MAX_SETS = 20;
const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7];

function createEmptyRow(): SetRow {
  return { team1A: '', team1B: '', team2C: '', team2D: '', score1: 0, score2: 0, saved: false };
}

export function LiveScoreScreen() {
  const { player, activeClubId, setActiveClubId, setScreen } = useApp();
  const [rows, setRows] = useState<SetRow[]>([createEmptyRow()]);
  const [savedCount, setSavedCount] = useState(0);
  const [showDone, setShowDone] = useState(false);

  const club = activeClubId ? getClubById(activeClubId) : null;
  const activeMembers = useMemo(() => {
    if (!activeClubId) return [] as ClubMember[];
    return getActiveMembersByClub(activeClubId);
  }, [activeClubId]);

  const memberOptions = activeMembers.map((m) => ({
    id: m.user_id,
    name: m.player_name,
  }));

  const getPlayerName = (id: string) => {
    const p = getPlayerById(id);
    return p?.nickname || p?.full_name || memberOptions.find((m) => m.id === id)?.name || 'Unknown';
  };

  const updateRow = (idx: number, updates: Partial<SetRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...updates } : r)));
  };

  const handleSaveRow = (idx: number) => {
    const row = rows[idx];
    if (!row.team1A || !row.team2C || row.score1 === row.score2) return;
    updateRow(idx, { saved: true });
    setSavedCount((c) => c + 1);
  };

  const handleAddRow = () => {
    if (rows.length >= MAX_SETS) return;
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (idx: number) => {
    if (rows.length === 1) return;
    setRows((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      if (prev[idx].saved) setSavedCount((c) => Math.max(0, c - 1));
      return filtered;
    });
  };

  const handleDone = () => {
    if (!activeClubId || !player) return;
    const validRows = rows.filter(
      (r) => r.saved && r.team1A && r.team2C && r.score1 !== r.score2
    );
    if (validRows.length === 0) {
      setShowDone(true);
      return;
    }

    const sets = validRows.map((r, idx) => ({
      id: '',
      club_id: activeClubId,
      set_index: idx + 1,
      team1_playerA_id: r.team1A,
      team1_playerA_name: getPlayerName(r.team1A),
      team1_playerB_id: r.team1B,
      team1_playerB_name: r.team1B ? getPlayerName(r.team1B) : '',
      team2_playerC_id: r.team2C,
      team2_playerC_name: getPlayerName(r.team2C),
      team2_playerD_id: r.team2D,
      team2_playerD_name: r.team2D ? getPlayerName(r.team2D) : '',
      team1_score: r.score1,
      team2_score: r.score2,
      winner_side: (r.score1 > r.score2 ? 'team1' : 'team2') as 'team1' | 'team2',
      recorded_by: player.id,
      created_at: '',
    }));

    saveTeamMatchBatch(sets);
    setActiveClubId(activeClubId);
    setScreen('inside-club');
  };

  const handleBack = () => {
    setScreen('inside-club');
  };

  const isRowValid = (r: SetRow) => r.team1A && r.team2C && r.score1 !== r.score2;
  const validSavedCount = rows.filter((r) => r.saved && isRowValid(r)).length;

  const renderPlayerSelect = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="field-input !py-2 !px-2 text-xs min-w-0 flex-1"
    >
      <option value="">{placeholder}</option>
      {memberOptions.map((m) => (
        <option key={m.id} value={m.id} className="bg-ink-700">
          {m.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mobile-frame bg-ink-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-[calc(var(--safe-top)+12px)] pb-2 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-white truncate">LiveScore Recorder</h1>
          <p className="text-[10px] text-lime-400/60 font-mono">{club?.name} · {validSavedCount}/{MAX_SETS} sets saved</p>
        </div>
      </div>

      {/* Session info */}
      <div className="px-4 pb-2">
        <div className="glass-card px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-lime-400/70" />
            <span className="text-[10px] text-white/50 font-mono">2 courts · 4 hrs · 2 sets/hr</span>
          </div>
          <span className="text-[10px] font-bold text-lime-400/80">{rows.length} rows open</span>
        </div>
      </div>

      {/* Match rows */}
      <div className="flex-1 scroll-area px-4 pb-28 pt-2 space-y-3">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={`glass-card p-3 animate-slide-up ${row.saved ? 'border-lime-400/20' : ''}`}
          >
            {/* Row label + actions */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${row.saved ? 'text-lime-400' : 'text-white/50'}`}>
                Set {idx + 1}:
              </span>
              <div className="flex items-center gap-1.5">
                {row.saved && (
                  <CircleCheck size={14} className="text-lime-400" />
                )}
                <button
                  onClick={() => handleSaveRow(idx)}
                  disabled={!isRowValid(row) || row.saved}
                  className="w-7 h-7 rounded-lg bg-lime-400/15 border border-lime-400/25 flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
                >
                  <Check size={14} className="text-lime-400" />
                </button>
                {rows.length > 1 && (
                  <button
                    onClick={() => handleRemoveRow(idx)}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <X size={14} className="text-white/40" />
                  </button>
                )}
              </div>
            </div>

            {/* Team row */}
            <div className="flex items-stretch gap-2">
              {/* Team 1 */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-lime-400/60 w-6 flex-shrink-0">T1</span>
                  <div className="flex gap-1 flex-1 min-w-0">
                    {renderPlayerSelect(row.team1A, (v) => updateRow(idx, { team1A: v }), 'P1 A')}
                    {renderPlayerSelect(row.team1B, (v) => updateRow(idx, { team1B: v }), 'P1 B')}
                  </div>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <select
                  value={row.score1}
                  onChange={(e) => updateRow(idx, { score1: parseInt(e.target.value) })}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-center text-sm font-bold text-white"
                >
                  {SCORE_OPTIONS.map((s) => (
                    <option key={s} value={s} className="bg-ink-700">{s}</option>
                  ))}
                </select>
                <span className="text-white/30 text-xs">-</span>
                <select
                  value={row.score2}
                  onChange={(e) => updateRow(idx, { score2: parseInt(e.target.value) })}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-center text-sm font-bold text-white"
                >
                  {SCORE_OPTIONS.map((s) => (
                    <option key={s} value={s} className="bg-ink-700">{s}</option>
                  ))}
                </select>
              </div>

              {/* Team 2 */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1 flex-1 min-w-0">
                    {renderPlayerSelect(row.team2C, (v) => updateRow(idx, { team2C: v }), 'P2 C')}
                    {renderPlayerSelect(row.team2D, (v) => updateRow(idx, { team2D: v }), 'P2 D')}
                  </div>
                  <span className="text-[9px] font-bold text-teal-400/60 w-6 flex-shrink-0 text-right">T2</span>
                </div>
              </div>
            </div>

            {/* Win indicator */}
            {isRowValid(row) && (
              <div className="mt-1.5 text-center">
                <span className={`text-[9px] font-bold ${row.score1 > row.score2 ? 'text-lime-400' : 'text-teal-400'}`}>
                  Win: Team {row.score1 > row.score2 ? '1' : '2'}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Add row button */}
        {rows.length < MAX_SETS && (
          <button
            onClick={handleAddRow}
            className="w-full py-3 rounded-xl border-2 border-dashed border-lime-400/20 flex items-center justify-center gap-2 text-sm font-medium text-lime-400/50 active:scale-95 active:border-lime-400/40 transition-all"
          >
            <Plus size={18} />
            Add Set {rows.length + 1}
          </button>
        )}

        {rows.length >= MAX_SETS && (
          <p className="text-center text-xs text-white/30 py-2">Maximum 20 sets reached</p>
        )}
      </div>

      {/* Done button */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-[calc(var(--safe-bottom)+16px)] pt-3 bg-gradient-to-t from-ink-900 via-ink-900 to-transparent">
        <button onClick={handleDone} className="btn-primary">
          <Trophy size={18} />
          Done — Save Session ({validSavedCount} sets)
        </button>
      </div>

      {/* Done confirmation modal */}
      {showDone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setShowDone(false)}>
          <div className="absolute inset-0 bg-black/60 animate-fade-in" />
          <div
            className="relative w-full max-w-sm bg-ink-800 rounded-3xl p-6 animate-scale-in text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-400/15 border-2 border-amber-400/30 mb-4">
              <Trophy size={28} className="text-amber-400" />
            </div>
            <h2 className="text-lg font-extrabold text-white mb-2">No sets saved</h2>
            <p className="text-sm text-white/40 mb-5">
              Save at least one set with the checkmark before ending the session.
            </p>
            <button onClick={() => setShowDone(false)} className="btn-primary">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
