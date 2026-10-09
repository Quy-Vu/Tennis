import { useState, useEffect } from 'react';
import { ChevronRight, Calendar } from 'lucide-react';
import { useApp } from '@/lib/context';
import { savePlayer, downscaleImage } from '@/lib/localDb';
import { AvatarUploader } from '@/components/AvatarUploader';

export function ProfileScreen() {
  const { player, refreshPlayer, setScreen } = useApp();
  const [avatar, setAvatar] = useState('');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dob, setDob] = useState('');
  const [handedness, setHandedness] = useState('Right');
  const [racketModel, setRacketModel] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (player) {
      setAvatar(player.avatar_url || '');
      setFullName(player.full_name || '');
      setNickname(player.nickname || '');
      setDob(player.dob || '');
      setHandedness(player.handedness || 'Right');
      setRacketModel(player.racket_model || '');
      setShoeSize(player.shoe_size || '');
    }
  }, [player]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Required';
    if (!nickname.trim()) e.nickname = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAvatarChange = async (dataUrl: string) => {
    const downscaled = await downscaleImage(dataUrl, 128);
    setAvatar(downscaled);
  };

  const handleNext = async () => {
    if (!validate() || !player) return;
    setSaving(true);

    try {
      const updated = {
        ...player,
        full_name: fullName.trim(),
        nickname: nickname.trim(),
        dob: dob || null,
        handedness,
        racket_model: racketModel.trim(),
        shoe_size: shoeSize.trim(),
        avatar_url: avatar,
        onboarding_complete: false,
      };
      savePlayer(updated);
      refreshPlayer();
      setScreen('club-management');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrors({ form: `Failed to save: ${msg}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-frame bg-ink-900 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-[calc(var(--safe-top)+20px)] pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-lime-400/60">STEP 1 / 3</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Your Profile</h1>
        <p className="text-sm text-white/40 mt-1">Tell us about your game</p>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 scroll-area px-6 pb-28 pt-4">
        <div className="flex justify-center mb-6 animate-fade-in">
          <AvatarUploader value={avatar} onChange={handleAvatarChange} size={120} />
        </div>

        <div className="space-y-4 animate-slide-up">
          <div>
            <label className="field-label">Full Name *</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Rafael Nadal"
              className="field-input"
            />
            {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="field-label">Nickname *</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Rafa"
              className="field-input"
            />
            {errors.nickname && <p className="text-xs text-red-400 mt-1">{errors.nickname}</p>}
          </div>

          <div>
            <label className="field-label">Date of Birth</label>
            <div className="relative">
              <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="field-input pl-11"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Handedness</label>
            <div className="flex gap-2">
              {['Left', 'Right'].map((h) => (
                <button
                  key={h}
                  onClick={() => setHandedness(h)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    handedness === h
                      ? 'bg-lime-400 text-ink-900'
                      : 'bg-white/6 text-white/50 border border-white/10'
                  }`}
                >
                  {h} Hand
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Racket Model</label>
            <input
              value={racketModel}
              onChange={(e) => setRacketModel(e.target.value)}
              placeholder="Babolat Pure Aero"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Shoe Size</label>
            <input
              value={shoeSize}
              onChange={(e) => setShoeSize(e.target.value)}
              placeholder="42"
              className="field-input"
            />
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
        <button onClick={handleNext} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? (
            <span className="inline-block w-5 h-5 border-2 border-ink-900/30 border-t-ink-900 rounded-full animate-spin" />
          ) : (
            <>
              Next: Club Setup
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
