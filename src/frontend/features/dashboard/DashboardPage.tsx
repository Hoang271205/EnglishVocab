import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import type { AuthUser } from '../auth/auth.types';
import LevelDistribution from '../review/LevelDistribution';
import DashboardStats from './DashboardStats';
import { useDashboard } from './useDashboard';

interface DashboardPageProps {
  user: AuthUser;
}

export default function DashboardPage({
  user,
}: DashboardPageProps) {
  const dashboard = useDashboard(user.id);

  return (
    <section>
      <p className="eyebrow">GÓC HỌC TẬP CỦA BẠN</p>
      <h1>Chào {user.name}!</h1>

      {dashboard.loading && (
        <StatusMessage>
          Đang tải tiến độ…
        </StatusMessage>
      )}

      {dashboard.error && (
        <div className="dashboard-error">
          <StatusMessage tone="error">
            {dashboard.error}
          </StatusMessage>

          <Button onClick={dashboard.reload}>
            Thử lại
          </Button>
        </div>
      )}

      {dashboard.summary && (
        <>
          <DashboardStats summary={dashboard.summary} />

          <LevelDistribution
            counts={dashboard.summary.levels}
          />
        </>
      )}
    </section>
  );
}