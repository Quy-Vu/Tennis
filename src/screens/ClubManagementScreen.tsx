import { useState, useRef, type ChangeEvent } from 'react';
import {
  ChevronRight, MapPin, Camera, ImagePlus, Calendar, Search, Check, X,
  MoreVertical, Shield, Pencil, Eye, Trash2, CheckCheck, Flag, ArrowLeft, Copy, Crown, Calculator,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import {
  createClub, downscaleImage, getMembersByClub, updateMember, deleteMember,
  getClubByCode, requestJoinClub, createDefaultScheduleDays, scheduleDaysToText,
  validateTimeRange,
} from '@/lib/localDb';
import { DEFAULT_LOGO, DEFAULT_COVER } from '@/lib/defaultImages';
import type { Club, ClubMember, MemberRole, ScheduleDay } from '@/lib/types';

type View = 'gate' | 'create' | 'search' | 'manage';

export function ClubManagementScreen() {
  const { player, pendingClubId, setScreen, setPendingClubId, completeOnboarding } = useApp();
  const [view, setView] = useState<View>('gate');
  const [tab, setTab] = useState<'pending' | 'active'>('pending');
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Club creation form state
  const [cover, setCover] = useState('');
  const [logo, setLogo] = useState('');
  const [name, setName] = useState('');
  const [foundationDate, setFoundationDate] = useState('');
  const [bio, setBio] = useState('');
  const [schedule, setSchedule] = useState('');
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>(createDefaultScheduleDays());
  const [scheduleError, setScheduleError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Success modal
  const [createdClub, setCreatedClub] = useState<Club | null>(null);

  // Club search state
  const [searchCode, setSearchCode] = useState('');
  const [foundClub, setFoundClub] = useState<Club | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'not-found'>('idle');
  const [joinRequested, setJoinRequested] = useState(false);

  const clubId = pendingClubId;

  // ---- Gate dialog ----
  const handleGateChoice = (hasClub: boolean) => {
    if (hasClub) {
      setView('search');
    } else {
      setView('create');
    }
  };

  // ---- Club creation ----
  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleCover = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const raw = await readFile(file);
      const downscaled = await downscaleImage(raw, 128);
      setCover(downscaled);
    }
  };

  const handleLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const raw = await readFile(file);
      const downscaled = await downscaleImage(raw, 128);
      setLogo(downscaled);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    if (!player) {
      setErrors({ form: 'No active player session. Please log in again.' });
      return;
    }
    setSaving(true);
    try {
      const scheduleText = scheduleDaysToText(scheduleDays);
      const club = createClub({
        name: name.trim(),
        foundationDate: foundationDate || null,
        bio: bio.trim(),
        schedule: scheduleText,
        scheduleDays,
        coverUrl: cover || DEFAULT_COVER,
        logoUrl: logo || DEFAULT_LOGO,
        creatorId: player.id,
        creatorName: player.nickname || player.full_name || name.trim(),
      });
      setCreatedClub(club);
      setPendingClubId(club.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrors({ form: `Failed to create club: ${msg}` });
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessContinue = () => {
    setCreatedClub(null);
    setView('manage');
    fetchMembers();
  };

  // ---- Club search ----
  const handleSearchChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 4);
    setSearchCode(cleaned);
    setJoinRequested(false);
    if (cleaned.length === 4) {
      const club = getClubByCode(cleaned);
      if (club) {
        setFoundClub(club);
        setSearchStatus('idle');
      } else {
        setFoundClub(null);
        setSearchStatus('not-found');
      }
    } else {
      setFoundClub(null);
      setSearchStatus('idle');
    }
  };

  const handleRequestJoin = () => {
    if (!foundClub || !player) return;
    requestJoinClub(foundClub.id, player.id, player.nickname || player.full_name);
    setJoinRequested(true);
    completeOnboarding();
    setTimeout(() => {
      setScreen('home');
    }, 1500);
  };

  // ---- Member management ----
  const fetchMembers = () => {
    if (!clubId) return;
    setLoading(true);
    setMembers(getMembersByClub(clubId));
    setLoading(false);
  };

  const approveMember = (id: string) => {
    updateMember(id, { status: 'active' });
    fetchMembers();
  };

  const rejectMember = (id: string) => {
    deleteMember(id);
    fetchMembers();
  };

  const setRole = (id: string, role: MemberRole) => {
    updateMember(id, { role });
    setMenuOpenId(null);
    fetchMembers();
  };

  const removeMember = (id: string) => {
    deleteMember(id);
    setMenuOpenId(null);
    fetchMembers();
  };

  const pending = members.filter((m) => m.status === 'pending');
  const active = members.filter((m) => m.status === 'active');

  const handleFinish = () => {
    completeOnboarding();
    setPendingClubId(null);
    setScreen('home');
  };

  const roleBadge = (role: MemberRole) => {
    const config: Record<string, { class: string; icon: typeof Shield; label: string }> = {
      chairman: { class: 'badge-chairman', icon: Crown, label: 'Chủ tịch: Full Control' },
      admin: { class: 'badge-admin', icon: Shield, label: 'Admin: Manage Members' },
      accountant: { class: 'badge-accountant', icon: Calculator, label: 'Kế toán: Manage Members' },
      member: { class: 'badge-member', icon: Eye, label: 'Thành viên: Record Matches' },
    };
    const c = config[role] || config.member;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${c.class}`}>
        <c.icon size={10} />
        {c.label}
      </span>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  // ==================== GATE DIALOG ====================
  if (view === 'gate') {
    return (
      <div className="mobile-frame bg-ink-900 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-lime-400/10 border border-lime-400/20 mb-5">
              <span className="text-4xl">🎾</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">
              Bạn đã có CLB nào chưa?
            </h2>
            <p className="text-sm text-white/40 mt-2">Do you have a club already?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleGateChoice(false)}
              className="btn-primary"
            >
              Chưa
              <span className="text-xs font-normal opacity-60">No, create one</span>
            </button>
            <button
              onClick={() => handleGateChoice(true)}
              className="w-full py-4 rounded-2xl bg-white/8 border border-white/10 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              Có rồi
              <span className="text-xs font-normal text-white/50">Yes, search & join</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== CLUB SEARCH VIEW ====================
  if (view === 'search') {
    return (
      <div className="mobile-frame bg-ink-900 flex flex-col">
        <div className="px-6 pt-[calc(var(--safe-top)+20px)] pb-2">
          <button
            onClick={() => setView('gate')}
            className="flex items-center gap-2 text-sm text-white/40 mb-3 active:text-white/70"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-2xl font-extrabold text-white">Tìm CLB</h1>
          <p className="text-sm text-white/40 mt-1">Enter a 4-digit club code to join</p>
        </div>

        <div className="flex-1 scroll-area px-6 pb-10 pt-4 space-y-5">
          <div>
            <label className="field-label">Nhập mã CLB (4 ký tự số)</label>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="tel"
                inputMode="numeric"
                value={searchCode}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="e.g. 1024"
                className="field-input pl-11 text-center text-2xl font-bold tracking-[0.5em]"
                maxLength={4}
              />
            </div>
          </div>

          {searchStatus === 'not-found' && (
            <div className="glass-card p-6 text-center animate-fade-in">
              <p className="text-sm text-white/40">No club found with code</p>
              <p className="text-lg font-bold text-white/60 font-mono mt-1">{searchCode}</p>
            </div>
          )}

          {foundClub && (
            <div className="glass-card p-5 animate-slide-up">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-ink-600 border-2 border-lime-400/20 flex-shrink-0">
                  {foundClub.logo_url ? (
                    <img src={foundClub.logo_url} alt={foundClub.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xl font-extrabold text-lime-400/40">
                        {foundClub.name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white truncate">{foundClub.name}</p>
                  <p className="text-xs font-mono text-lime-400/60 mt-0.5">ID: {foundClub.club_code}</p>
                </div>
              </div>

              {foundClub.bio && (
                <p className="text-sm text-white/50 leading-relaxed mb-4">{foundClub.bio}</p>
              )}

              {foundClub.schedule && (
                <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
                  <Calendar size={14} className="text-lime-400/50" />
                  <span>{foundClub.schedule}</span>
                </div>
              )}

              {joinRequested ? (
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400/10 border border-lime-400/20 animate-scale-in">
                  <Check size={18} className="text-lime-400" />
                  <span className="text-sm font-semibold text-lime-400">Join request sent! Going to Home...</span>
                </div>
              ) : (
                <button onClick={handleRequestJoin} className="btn-primary">
                  Xin Gia Nhập CLB
                  <span className="text-xs font-normal opacity-60">Request to Join</span>
                </button>
              )}
            </div>
          )}

          {searchCode.length < 4 && (
            <div className="text-center pt-4">
              <p className="text-xs text-white/20">Type 4 digits to search</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== CLUB CREATION VIEW ====================
  if (view === 'create') {
    return (
      <div className="mobile-frame bg-ink-900 flex flex-col">
        <div className="px-6 pt-[calc(var(--safe-top)+20px)] pb-2">
          <button
            onClick={() => setView('gate')}
            className="flex items-center gap-2 text-sm text-white/40 mb-3 active:text-white/70"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-xs font-mono text-lime-400/60">CLUB SETUP</span>
          <h1 className="text-2xl font-extrabold text-white">Create Your Club</h1>
          <p className="text-sm text-white/40 mt-1">Set up your tennis community</p>
        </div>

        <div className="flex-1 scroll-area px-6 pb-28 pt-4">
          {/* Cover banner uploader */}
          <button
            onClick={() => coverRef.current?.click()}
            className="w-full aspect-[16/8] rounded-2xl overflow-hidden bg-ink-700 border border-white/10 relative group mb-4"
          >
            {cover ? (
              <img src={cover} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <ImagePlus size={28} className="text-white/30" />
                <span className="text-xs text-white/30 font-medium">Upload Cover Banner</span>
              </div>
            )}
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
              <Camera size={16} className="text-white/70" />
            </div>
          </button>

          {/* Logo + update button */}
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={() => logoRef.current?.click()}
              className="w-20 h-20 rounded-full overflow-hidden bg-ink-700 border-2 border-lime-400/20 flex-shrink-0"
            >
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={20} className="text-white/30" />
                </div>
              )}
            </button>
            <button
              onClick={() => logoRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-white/8 text-sm font-semibold text-white/80 border border-white/10 active:scale-95 transition-all"
            >
              Update Logo
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="field-label">Club Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Grand Slam Tennis Club"
                className="field-input"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="field-label">Foundation Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="date"
                  value={foundationDate}
                  onChange={(e) => setFoundationDate(e.target.value)}
                  className="field-input pl-11"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Club Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A brief description of your club..."
                rows={3}
                className="field-input resize-none"
              />
            </div>

            <div>
              <label className="field-label">Activity Schedule (up to 7 days/week)</label>
              <div className="space-y-2">
                {scheduleDays.map((sd, idx) => (
                  <div key={sd.day} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/8">
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...scheduleDays];
                        next[idx] = { ...sd, enabled: !sd.enabled };
                        setScheduleDays(next);
                        setScheduleError('');
                      }}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                        sd.enabled
                          ? 'bg-lime-400 text-ink-900'
                          : 'bg-white/5 text-white/40'
                      }`
                      }
                    >
                      {sd.day.slice(0, 3)}
                    </button>
                    {sd.enabled ? (
                      <>
                        <input
                          type="time"
                          min="05:00"
                          max="23:00"
                          value={sd.startTime}
                          onChange={(e) => {
                            const next = [...scheduleDays];
                            next[idx] = { ...sd, startTime: e.target.value };
                            setScheduleDays(next);
                            const err = validateTimeRange(e.target.value, sd.endTime);
                            setScheduleError(err || '');
                          }}
                          className="field-input !py-2 text-xs flex-1"
                        />
                        <span className="text-white/30 text-xs">to</span>
                        <input
                          type="time"
                          min="05:00"
                          max="23:00"
                          value={sd.endTime}
                          onChange={(e) => {
                            const next = [...scheduleDays];
                            next[idx] = { ...sd, endTime: e.target.value };
                            setScheduleDays(next);
                            const err = validateTimeRange(sd.startTime, e.target.value);
                            setScheduleError(err || '');
                          }}
                          className="field-input !py-2 text-xs flex-1"
                        />
                      </>
                    ) : (
                      <span className="text-xs text-white/30 flex-1">Off</span>
                    )}
                  </div>
                ))}
              </div>
              {scheduleError && (
                <p className="text-xs text-red-400 mt-1.5">{scheduleError}</p>
              )}
              <p className="text-[10px] text-white/25 mt-1.5">Play hours: 05:00 – 23:00 only</p>
            </div>

            {/* Static visual map card */}
            <div>
              <label className="field-label">Court Location</label>
              <div className="relative rounded-2xl overflow-hidden h-44 border border-white/10">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(135deg, #0F3530 0%, #123E38 40%, #1A4D44 100%)',
                  }}
                >
                  <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#CCFF00" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                  <div className="absolute top-[60%] left-0 right-0 h-1 bg-white/8" />
                  <div className="absolute top-0 bottom-0 left-[45%] w-1 bg-white/8" />
                  <div className="absolute top-[25%] left-[10%] w-[60%] h-0.5 bg-white/5 rotate-12" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <span className="absolute w-12 h-12 rounded-full bg-lime-400/20 animate-pulse-ring" />
                  <div className="w-10 h-10 rounded-full bg-lime-400 flex items-center justify-center shadow-lg shadow-lime-400/30 z-10">
                    <MapPin size={20} className="text-ink-900" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="glass-card px-3 py-1.5">
                    <span className="text-xs font-mono text-lime-400/80">37.7749° N, 122.4194° W</span>
                  </div>
                  <span className="text-xs text-white/50 font-medium">Court GPS Pin</span>
                </div>
              </div>
            </div>

            {errors.form && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                {errors.form}
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom button */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-[calc(var(--safe-bottom)+16px)] pt-3 bg-gradient-to-t from-ink-900 via-ink-900 to-transparent">
          <button onClick={handleCreate} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? (
              <span className="inline-block w-5 h-5 border-2 border-ink-900/30 border-t-ink-900 rounded-full animate-spin" />
            ) : (
              <>
                Save / Create Club
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>

        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />

        {/* Success modal showing 4-digit Club ID */}
        {createdClub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={handleSuccessContinue}>
            <div className="absolute inset-0 bg-black/70 animate-fade-in" />
            <div
              className="relative w-full max-w-sm bg-ink-800 rounded-3xl p-8 animate-scale-in text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime-400/15 border-2 border-lime-400/30 mb-5">
                <Check size={32} className="text-lime-400" />
              </div>
              <h2 className="text-lg font-extrabold text-white mb-1">Club Created!</h2>
              <p className="text-sm text-white/40 mb-6">Save this ID — it's used for tracking and search</p>

              <div className="bg-ink-700 rounded-2xl p-6 mb-6">
                <p className="text-xs font-mono text-lime-400/50 uppercase tracking-wider mb-2">Club ID</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl font-extrabold text-lime-400 font-mono tracking-[0.15em]">
                    {createdClub.club_code}
                  </span>
                  <button
                    onClick={() => copyToClipboard(createdClub.club_code)}
                    className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Copy size={16} className="text-white/40" />
                  </button>
                </div>
                <p className="text-sm font-semibold text-white mt-3">{createdClub.name}</p>
              </div>

              <button onClick={handleSuccessContinue} className="btn-primary">
                Continue to Management
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== MANAGE VIEW (existing management) ====================
  return (
    <div className="mobile-frame bg-ink-900 flex flex-col">
      <div className="px-6 pt-[calc(var(--safe-top)+20px)] pb-2">
        <span className="text-xs font-mono text-lime-400/60">STEP 3 / 3</span>
        <h1 className="text-2xl font-extrabold text-white">Club Management</h1>
        <p className="text-sm text-white/40 mt-1">Review requests and manage roles</p>
      </div>

      <div className="px-6 pt-3">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => setTab('pending')}
            className={`seg-btn ${tab === 'pending' ? 'seg-btn-active' : 'seg-btn-inactive'}`}
          >
            Pending Requests{pending.length > 0 && ` (${pending.length})`}
          </button>
          <button
            onClick={() => setTab('active')}
            className={`seg-btn ${tab === 'active' ? 'seg-btn-active' : 'seg-btn-inactive'}`}
          >
            Active Members{active.length > 0 && ` (${active.length})`}
          </button>
        </div>
      </div>

      <div className="flex-1 scroll-area px-6 pb-28 pt-4">
        {loading ? (
          <div className="flex justify-center pt-10">
            <span className="inline-block w-6 h-6 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
          </div>
        ) : tab === 'pending' ? (
          pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 text-center">
              <CheckCheck size={40} className="text-white/15 mb-3" />
              <p className="text-sm text-white/30 font-medium">No pending requests</p>
              <p className="text-xs text-white/20 mt-1">New join requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((m) => (
                <div key={m.id} className="glass-card p-4 flex items-center gap-3 animate-slide-up">
                  <div className="w-12 h-12 rounded-full bg-ink-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-lime-400/70">
                      {(m.player_name || '?')[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {m.player_name || 'Unknown Player'}
                    </p>
                    <p className="text-xs text-white/40">Wants to join</p>
                  </div>
                  <button
                    onClick={() => rejectMember(m.id)}
                    className="w-9 h-9 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <X size={16} className="text-red-400" />
                  </button>
                  <button
                    onClick={() => approveMember(m.id)}
                    className="w-9 h-9 rounded-xl bg-lime-400/15 border border-lime-400/25 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <Check size={16} className="text-lime-400" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {active.map((m) => (
              <div key={m.id} className="glass-card p-4 flex items-center gap-3 animate-slide-up relative">
                <div className="w-12 h-12 rounded-full bg-ink-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-lime-400/70">
                    {(m.player_name || '?')[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {m.player_name || 'Unknown'}
                    {m.user_id === player?.id && (
                      <span className="text-xs text-lime-400/60 ml-1.5">(You)</span>
                    )}
                  </p>
                  <div className="mt-1">{roleBadge(m.role)}</div>
                </div>
                <button
                  onClick={() => setMenuOpenId(menuOpenId === m.id ? null : m.id)}
                  className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center active:scale-90 transition-all"
                >
                  <MoreVertical size={16} className="text-white/50" />
                </button>

                {menuOpenId === m.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                    <div className="absolute right-4 top-14 z-20 w-48 glass-card !rounded-xl p-1.5 animate-scale-in shadow-xl">
                      {m.role !== 'chairman' && (
                        <button
                          onClick={() => setRole(m.id, 'admin')}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-white/5 transition-all text-left"
                        >
                          <Shield size={14} className="text-teal-400" />
                          <span className="text-xs font-semibold text-white">Set Admin</span>
                        </button>
                      )}
                      {m.role !== 'chairman' && (
                        <button
                          onClick={() => setRole(m.id, 'accountant')}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-white/5 transition-all text-left"
                        >
                          <Calculator size={14} className="text-amber-400" />
                          <span className="text-xs font-semibold text-white">Set Kế toán</span>
                        </button>
                      )}
                      {m.role !== 'chairman' && (
                        <button
                          onClick={() => setRole(m.id, 'member')}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-white/5 transition-all text-left"
                        >
                          <Eye size={14} className="text-white/50" />
                          <span className="text-xs font-semibold text-white">Set Thành viên</span>
                        </button>
                      )}
                      <div className="h-px bg-white/8 my-1" />
                      {m.role !== 'chairman' && (
                        <button
                          onClick={() => removeMember(m.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-red-400/10 transition-all text-left"
                        >
                          <Trash2 size={14} className="text-red-400" />
                          <span className="text-xs font-semibold text-red-400">Remove Member</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-6 pb-[calc(var(--safe-bottom)+16px)] pt-3 bg-gradient-to-t from-ink-900 via-ink-900 to-transparent">
        <button onClick={handleFinish} className="btn-primary">
          Finish & Go to Home
        </button>
      </div>
    </div>
  );
}
