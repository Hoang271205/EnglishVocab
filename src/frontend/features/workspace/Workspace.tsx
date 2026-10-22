import { useState } from 'react';
import MainNavigation from '../../components/MainNavigation';
import AppShell from '../../components/layout/AppShell';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import { navigation } from '../../components/navigation';
import type { Tab } from '../../components/navigation';
import type { AuthUser } from '../auth/auth.types';
import DashboardPage from '../dashboard/DashboardPage';
import TopicsPage from '../topics/TopicsPage';
import { useLearning } from '../learning/LearningContext';
import LearningSessionPage from '../learning/LearningSessionPage';
import PendingLearningBanner from '../learning/PendingLearningBanner';

type OnlineTab = 'review' | 'learn';

interface WorkspaceProps {
  user: AuthUser;
  busy: boolean;
  authError: string | null;
  onLogout: () => Promise<void>;
}

const onlineNavigation = navigation.filter(
  (item) => item.id !== 'notebook',
);

export default function Workspace({
  user,
  busy,
  authError,
  onLogout,
}: WorkspaceProps) {
  const [activeTab, setActiveTab] =
    useState<OnlineTab>('review');

  const learning = useLearning();

  function navigate(tab: Tab) {
    if (tab === 'notebook' || learning.working) return;
    setActiveTab(tab);
  }

  const account = (
    <>
      <span>{user.name}</span>

      <Button
        variant="secondary"
        loading={busy}
        disabled={learning.working}
        onClick={() => void onLogout()}
      >
        {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </Button>
    </>
  );

  if (learning.sessionId) {
    return (
      <AppShell account={account}>
        <LearningSessionPage
          key={learning.sessionId}
          sessionId={learning.sessionId}
          voiceURI={learning.voiceURI}
          onExit={learning.closeSession}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      account={account}
      navigation={
        <MainNavigation
          items={onlineNavigation}
          activeTab={activeTab}
          onNavigate={navigate}
        />
      }
    >
      {authError && (
        <StatusMessage tone="error">
          {authError}
        </StatusMessage>
      )}

      <PendingLearningBanner />

      {activeTab === 'review' ? (
        <DashboardPage user={user} />
      ) : (
        <TopicsPage />
      )}
    </AppShell>
  );
}