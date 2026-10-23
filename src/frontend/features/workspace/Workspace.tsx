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
import ReviewSessionPage from '../reviewing/ReviewSessionPage';
import OnlineNotebookPage from '../online-notebook/OnlineNotebookPage';
import ReviewStartPanel from '../reviewing/ReviewStartPanel';
import { useReviewWorkspace } from '../reviewing/useReviewWorkspace';

type OnlineTab = Tab;

interface WorkspaceProps {
  user: AuthUser;
  busy: boolean;
  authError: string | null;
  onLogout: () => Promise<void>;
}

const onlineNavigation = navigation;

export default function Workspace({
  user,
  busy,
  authError,
  onLogout,
}: WorkspaceProps) {
  const [contentVersion, setContentVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<OnlineTab>('review');

  const learning = useLearning();

  const review = useReviewWorkspace(learning.pending !== null);

  const preparing = learning.working || review.working;

  function navigate(tab: Tab) {
    if (preparing) return;
    setActiveTab(tab);
  }

  function refreshWorkspace() {
    learning.reload();
    review.reload();
    setContentVersion((value) => value + 1);
  }

  function closeReview() {
    review.close();
    learning.reload();
  }

  function closeLearning() {
    learning.closeSession();
    review.reload();
  }

  const account = (
    <>
      <span>{user.name}</span>

      <Button
        variant="secondary"
        loading={busy}
        disabled={preparing}
        onClick={() => void onLogout()}
      >
        {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </Button>
    </>
  );

  if (review.sessionId) {
    return (
      <AppShell account={account}>
        <ReviewSessionPage
          key={review.sessionId}
          sessionId={review.sessionId}
          voiceURI={learning.voiceURI}
          onExit={closeReview}
        />
      </AppShell>
    );
  }

  if (learning.sessionId) {
    return (
      <AppShell account={account}>
        <LearningSessionPage
          key={learning.sessionId}
          sessionId={learning.sessionId}
          voiceURI={learning.voiceURI}
          onExit={closeLearning}
        />
      </AppShell>
    );
  }

  const pendingReview = review.pending;

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
      {authError && <StatusMessage tone="error">{authError}</StatusMessage>}

      <PendingLearningBanner />

      {review.error && (
        <div className="dashboard-error">
          <StatusMessage tone="error">{review.error}</StatusMessage>

          <Button
            variant="secondary"
            disabled={review.loading || preparing}
            onClick={review.reload}
          >
            Tải lại lượt ôn
          </Button>
        </div>
      )}

      {pendingReview && (
        <div className="pending-session">
          <div>
            <strong>Bạn có một phiên ôn đang dở</strong>

            <p>
              Đã trả lời{' '}
              {Math.min(
                pendingReview.total,
                pendingReview.index +
                  (pendingReview.phase === 'feedback' ? 1 : 0),
              )}
              /{pendingReview.total} từ.
            </p>
          </div>

          <Button disabled={preparing} onClick={review.resume}>
            Tiếp tục ôn
          </Button>
        </div>
      )}

      {activeTab === 'review' ? (
        <DashboardPage key={contentVersion} user={user}>
          <ReviewStartPanel
            defaultBatchSize={review.batchSize}
            working={preparing}
            disabled={
              learning.loading ||
              review.loading ||
              Boolean(learning.pending) ||
              Boolean(review.pending) ||
              Boolean(learning.error) ||
              Boolean(review.error)
            }
            onStart={review.start}
          />
        </DashboardPage>
      ) : activeTab === 'notebook' ? (
        <OnlineNotebookPage
          ownerId={user.id}
          canLearn={
            !review.pending && !review.loading && !review.error && !preparing
          }
          onChanged={refreshWorkspace}
        />
      ) : (
        <fieldset
          className="online-topics-group"
          disabled={
            Boolean(review.pending) ||
            review.loading ||
            review.working ||
            Boolean(review.error)
          }
        >
          <TopicsPage />
        </fieldset>
      )}
    </AppShell>
  );
}
