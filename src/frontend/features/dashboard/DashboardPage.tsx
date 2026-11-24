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
  const summary = dashboard.summary;
  const greeting = pending
    ? {
        title: 'Mình học tiếp nhé!',
        text: 'Bài đang dở vẫn chờ bạn. Chọn Tiếp tục để học từ chỗ đã dừng.',
      }
    : !summary
      ? {
          title: 'Mỗi ngày, nhớ thêm một chút',
          text: 'Mình cùng xem hôm nay có gì để học nhé!',
        }
      : summary.learnedCount === 0
        ? {
            title: 'Bắt đầu với những từ đầu tiên',
            text: 'Chọn Học từ mới để khám phá chủ đề bạn thích nhé!',
          }
        : summary.dueCount > 0
          ? {
              title: `${summary.dueCount} từ đang chờ bạn ôn`,
              text: 'Ôn một lượt ngắn để những từ đã học ở lại lâu hơn nhé!',
            }
          : {
              title: 'Bạn đã ôn xong rồi!',
              text: 'Nghỉ một chút, hoặc học thêm vài từ mới cùng mình nhé!',
            };

  return (
    <section>
      <div className="page-intro dashboard-intro">
        <div>
          <p className="eyebrow">GÓC HỌC TẬP CỦA BẠN</p>
          <h1>Chào {user.name}!</h1>
        </div>
        <Mascot
          className="mascot--intro-note"
          messageLabel="BẠN ĐỒNG HÀNH"
          messageTitle={greeting.title}
          message={greeting.text}
        />
      </div>

      {dashboard.loading && (
        <LoadingSkeleton variant="dashboard" label="Đang tải tiến độ" />
      )}

      {dashboard.error && (
        <div className="dashboard-error">
          <StatusMessage tone="error">{dashboard.error}</StatusMessage>

          <Button variant="secondary" onClick={dashboard.reload}>
            Thử lại
          </Button>
        </div>
      )}

      {dashboard.summary && (
        <>
          {pending ? null : dashboard.summary.dueCount > 0 ? (
            <section
              className="today-work today-work--review"
              aria-label="Việc học hôm nay"
            >
              <div className="review-priority">
                <p className="eyebrow">ƯU TIÊN HÔM NAY</p>
                <h2 className="review-priority-title">
                  <strong>
                    {dashboard.summary.dueCount.toLocaleString('vi-VN')}
                  </strong>
                  <span>từ đang chờ bạn ôn</span>
                </h2>
              </div>
              {children}
            </section>
          ) : (
            <div className="context-empty today-work">
              <div>
                <p className="eyebrow">BƯỚC TIẾP THEO</p>
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
          <div className="progress-section-heading">
            <h2>Hành trình của bạn</h2>
            <p>Nhìn lại những từ bạn đã học và mức ghi nhớ hiện tại.</p>
          </div>
          <DashboardStats summary={dashboard.summary} />
          <LevelDistribution counts={dashboard.summary.levels} />
        </>
      )}
    </section>
  );
}
