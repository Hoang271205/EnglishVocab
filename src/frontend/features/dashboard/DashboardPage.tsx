import Mascot from '../../components/mascot/Mascot';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import type { AuthUser } from '../auth/auth.types';
import LevelDistribution from '../../components/charts/LevelDistribution';
import DashboardStats from './DashboardStats';
import { useDashboard } from './useDashboard';
import type { ReactNode } from 'react';

interface DashboardPageProps {
  user: AuthUser;
  children?: ReactNode;
  onLearn: () => void;
  pending: boolean;
  preparing: boolean;
}

export default function DashboardPage({
  user,
  children,
  onLearn,
  pending,
  preparing,
}: DashboardPageProps) {
  const dashboard = useDashboard(user.id);

  return (
    <section>
      <div className="page-intro dashboard-intro">
        <div>
          <p className="eyebrow">GÓC HỌC TẬP CỦA BẠN</p>
          <h1>Chào {user.name}!</h1>
        </div>
        <Mascot
          message={
            pending
              ? 'Mình học tiếp bài đang dở nhé!'
              : dashboard.summary?.learnedCount === 0
                ? 'Mình cùng học những từ đầu tiên nhé!'
                : (dashboard.summary?.dueCount ?? 0) > 0
                  ? 'Đến lúc củng cố trí nhớ rồi. Mình cùng ôn nhé!'
                  : 'Mỗi ngày một chút, mình cùng tiến bộ nhé!'
          }
        />
      </div>

      {dashboard.loading && (
        <LoadingSkeleton variant="dashboard" label="Đang tải tiến độ" />
      )}

      {dashboard.error && (
        <div className="dashboard-error">
          <StatusMessage tone="error">{dashboard.error}</StatusMessage>

          <Button onClick={dashboard.reload}>Thử lại</Button>
        </div>
      )}

      {dashboard.summary && (
        <>
          <DashboardStats summary={dashboard.summary} />
          {pending ? (
            <div className="context-message">
              <strong>Bạn có một phiên đang dở</strong>
              <p>Chọn Tiếp tục ở phía trên để học tiếp từ chỗ đã dừng nhé.</p>
            </div>
          ) : dashboard.summary.dueCount > 0 ? (
            <>
              <p className="context-caption">
                Có {dashboard.summary.dueCount} từ đến hạn. Chọn bộ từ, số lượng
                rồi bắt đầu ôn nhé!
              </p>
              {children}
            </>
          ) : (
            <div className="context-empty">
              <div>
                <h2>
                  {dashboard.summary.learnedCount === 0
                    ? 'Mình cùng học những từ đầu tiên nhé!'
                    : 'Bạn đã ôn xong các từ đến hạn!'}
                </h2>
                <p>
                  {dashboard.summary.learnedCount === 0
                    ? 'Học từ mới, viết lại để ghi nhớ rồi xem các từ đã học trong sổ tay.'
                    : 'Các từ đã học đang chờ lần ôn tiếp theo. Bạn có thể khám phá thêm từ mới.'}
                </p>
                {dashboard.summary.nextReviewAt && (
                  <p>
                    Lần ôn tiếp theo:{' '}
                    {new Date(dashboard.summary.nextReviewAt).toLocaleString(
                      'vi-VN',
                    )}
                  </p>
                )}
                <Button icon="learn" disabled={preparing} onClick={onLearn}>
                  Học từ mới
                </Button>
              </div>
            </div>
          )}
          <LevelDistribution counts={dashboard.summary.levels} />
        </>
      )}
    </section>
  );
}
