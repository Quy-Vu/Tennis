import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Player, ScreenName } from './types';
import {
  getCurrentPlayer,
  setSession as setLocalSession,
  clearSession,
  savePlayer,
  getClubsForPlayer,
  ensurePlayerCode,
} from './localDb';

interface AppContextValue {
  player: Player | null;
  loading: boolean;
  screen: ScreenName;
  setScreen: (s: ScreenName) => void;
  activeClubId: string | null;
  setActiveClubId: (id: string | null) => void;
  refreshPlayer: () => void;
  signOut: () => void;
  login: (player: Player) => void;
  register: (player: Player) => void;
  completeOnboarding: () => void;
  pendingClubId: string | null;
  setPendingClubId: (id: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<ScreenName>('auth');
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [pendingClubId, setPendingClubId] = useState<string | null>(null);

  useEffect(() => {
    const current = getCurrentPlayer();
    if (current && current.onboarding_complete) {
      setPlayer(current);
      setScreen('home');
    } else {
      clearSession();
      setPlayer(null);
      setScreen('auth');
    }
    setLoading(false);
  }, []);

  const refreshPlayer = useCallback(() => {
    const current = getCurrentPlayer();
    setPlayer(current);
    if (current) {
      setScreen(current.onboarding_complete ? 'home' : 'profile');
    } else {
      setScreen('auth');
    }
  }, []);

  const login = useCallback((p: Player) => {
    const withCode = ensurePlayerCode(p);
    const updated = { ...withCode, onboarding_complete: true };
    savePlayer(updated);
    setLocalSession(updated.id);
    setPlayer(updated);
    setScreen('home');
  }, []);

  const register = useCallback((p: Player) => {
    setLocalSession(p.id);
    setPlayer(p);
    setScreen('profile');
  }, []);

  const completeOnboarding = useCallback(() => {
    const current = getCurrentPlayer();
    if (!current) return;
    const updated = { ...current, onboarding_complete: true };
    savePlayer(updated);
    setPlayer(updated);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setPlayer(null);
    setScreen('auth');
    setActiveClubId(null);
    setPendingClubId(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        player,
        loading,
        screen,
        setScreen,
        activeClubId,
        setActiveClubId,
        refreshPlayer,
        signOut,
        login,
        register,
        completeOnboarding,
        pendingClubId,
        setPendingClubId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { savePlayer };
