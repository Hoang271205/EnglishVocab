import AccountMenu from '../../components/AccountMenu';
import GuideDock from '../../components/mascot/GuideDock';
import { useWorkspaceTab } from './useWorkspaceTab';
import { lazy, useState } from 'react';
import MainNavigation from '../../components/MainNavigation';
import AppShell from '../../components/layout/AppShell';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import { navigation } from '../../components/navigation';
import type { Tab } from '../../components/navigation';
import type { AuthUser } from '../auth/auth.types';
import DashboardPage from '../dashboard/DashboardPage';
import { useLearning } from '../learning/LearningContext';
import PendingLearningBanner from '../learning/PendingLearningBanner';
import ReviewStartPanel from '../reviewing/ReviewStartPanel';
import { useReviewWorkspace } from '../reviewing/useReviewWorkspace';

const SettingsPage = lazy(() => import('../settings/SettingsPage'));
const TopicsPage = lazy(() => import('../topics/TopicsPage'));
const LearningSessionPage = lazy(
  () => import('../learning/LearningSessionPage'),
);
const ReviewSessionPage = lazy(() => import('../reviewing/ReviewSessionPage'));
const OnlineNotebookPage = lazy(
  () => import('../online-notebook/OnlineNotebookPage'),
);

interface WorkspaceProps {
  user: AuthUser;
  onUserChanged: (user: AuthUser) => void;
  busy: boolean;
  authError: string | null;
  onLogout: () => Promise<void>;
}

const onlineNavigation = navigation;

export default function Workspace({
  user,
  onUserChanged,
  busy,
  authError,
  onLogout,
}: WorkspaceProps) {
  const [contentVersion, setContentVersion] = useState(0);
  const [activeTab, setActiveTab] = useWorkspaceTab();

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
    <AccountMenu
      user={user}
      busy={busy}
      disabled={preparing}
      onSettings={() => navigate('settings')}
      onLogout={onLogout}
    />
  );
  const personalSettings = (
    <>
      {(review.sessionId || learning.sessionId) && (
        <Button
          variant="secondary"
          onClick={() => navigate(review.sessionId ? 'review' : 'learn')}
        >
          Trở lại bài đang học
        </Button>
      )}
      <SettingsPage user={user} onUserChanged={onUserChanged} />
    </>
  );

  if (review.sessionId) {
    return (
      <AppShell account={account}>
        {activeTab === 'settings' && personalSettings}
        <div hidden={activeTab === 'settings'}>
          <ReviewSessionPage
            key={review.sessionId}
            ownerId={user.id}
            sessionId={review.sessionId}
            voiceURI={learning.voiceURI}
            onExit={closeReview}
            onOpenNotebook={() => {
              closeReview();
              setActiveTab('notebook');
            }}
          />
        </div>
      </AppShell>
    );
  }

  if (learning.sessionId) {
    return (
      <AppShell account={account}>
        {activeTab === 'settings' && personalSettings}
        <div hidden={activeTab === 'settings'}>
          <LearningSessionPage
            key={learning.sessionId}
            ownerId={user.id}
            sessionId={learning.sessionId}
            voiceURI={learning.voiceURI}
            onExit={closeLearning}
          />
        </div>
      </AppShell>
    );
  }

  const pendingReview = review.pending;
  const guideSteps = [
    {
      title:
        learning.pending || pendingReview
          ? 'Tiếp tục bài đang dở'
          : activeTab === 'settings'
            ? 'Cài đặt của bạn'
            : activeTab === 'learn'
              ? 'Chọn một chủ đề'
              : activeTab === 'notebook'
                ? 'Khám phá sổ tay'
                : 'Góc học tập của bạn',
      text:
        learning.pending || pendingReview
          ? 'Chọn Tiếp tục trong thông báo phía trên. Hoàn tất phiên đang dở trước khi mở lượt học hoặc ôn mới.'
          : activeTab === 'settings'
            ? 'Cập nhật tên hiển thị và mật khẩu của tài khoản.'
            : activeTab === 'learn'
              ? 'Chọn IELTS hoặc Giao tiếp, tìm chủ đề rồi mở chủ đề để bắt đầu học.'
              : activeTab === 'notebook'
                ? 'Từ đã học là những từ bạn đã luyện. Từ của tôi chứa từ bạn tự thêm hoặc lưu khi đọc.'
                : 'Các thẻ cho biết số từ đã học, đến hạn và thành thạo. Chưa có từ đến hạn? Bạn có thể học thêm từ mới.',
    },
    {
      title: 'Học và ghi nhớ',
      text: 'Nghe phát âm, đọc nghĩa và câu ví dụ. Sau đó viết lại từ. Từ viết đúng được lưu vào sổ tay và lịch ôn; từ bỏ qua không được thêm vào lịch ôn.',
    },
    {
      title: 'Ôn đúng thời điểm',
      text: 'Khi có từ đến hạn, chọn bộ từ và số từ mỗi lượt rồi bắt đầu ôn. Bạn có thể lưu nháp, tạm dừng và tiếp tục sau. Kết thúc phiên sẽ có tổng kết đúng và sai.',
    },
  ];

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

      {activeTab === 'settings' ? (
        personalSettings
      ) : activeTab === 'review' ? (
        <DashboardPage
          key={contentVersion}
          user={user}
          onLearn={() => navigate('learn')}
          pending={Boolean(learning.pending || review.pending)}
          preparing={preparing || learning.loading || review.loading}
        >
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
          onBrowseTopics={() => navigate('learn')}
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
          {review.pending && (
            <p className="action-explanation">
              Bạn có phiên ôn đang dở. Chọn “Tiếp tục ôn” ở đầu trang để hoàn
              thành trước khi bắt đầu bài mới.
            </p>
          )}
        </fieldset>
      )}
      {activeTab !== 'settings' && (
        <GuideDock key={activeTab} steps={guideSteps} />
      )}
    </AppShell>
  );
}
