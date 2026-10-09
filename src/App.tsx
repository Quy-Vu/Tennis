import { AppProvider, useApp } from '@/lib/context';
import { AuthScreen } from '@/screens/AuthScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ClubManagementScreen } from '@/screens/ClubManagementScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { InsideClubScreen } from '@/screens/InsideClubScreen';
import { LiveScoreScreen } from '@/screens/LiveScoreScreen';

function ScreenRouter() {
  const { screen, loading } = useApp();

  if (loading) {
    return (
      <div className="mobile-frame bg-ink-900 flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
      </div>
    );
  }

  switch (screen) {
    case 'auth':
      return <AuthScreen />;
    case 'profile':
      return <ProfileScreen />;
    case 'club-creation':
    case 'club-management':
      return <ClubManagementScreen />;
    case 'home':
      return <HomeScreen />;
    case 'inside-club':
      return <InsideClubScreen />;
    case 'live-score':
      return <LiveScoreScreen />;
    default:
      return <AuthScreen />;
  }
}

function App() {
  return (
    <AppProvider>
      <ScreenRouter />
    </AppProvider>
  );
}

export default App;
