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

}

export default function DashboardPage({
  user,
  children,
}: DashboardPageProps) {

  const dashboard = useDashboard(user.id);

  return (
    <section>
      <p className="eyebrow">GÓC HỌC TẬP CỦA BẠN</p>
      <h1>Chào {user.name}!</h1>

      {dashboard.loading && (
        <LoadingSkeleton variant="dashboard" label="Đang tải tiến độ" />
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
          {children}
          <LevelDistribution
            counts={dashboard.summary.levels}
          />
        </>
      )}
    </section>
  );
}
