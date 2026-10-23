import Icon from '../../components/ui/Icon';
import type { IconName } from '../../components/ui/Icon';
import type { DashboardSummary } from './dashboard.types';

interface DashboardStatsProps {
  summary: DashboardSummary;
}

export default function DashboardStats({ summary }: DashboardStatsProps) {
  const items: { label: string; value: number; icon: IconName }[] = [
    {
      label: 'Từ đã học',
      icon: 'notebook',
      value: summary.learnedCount,
    },
    {
      label: 'Từ đến hạn',
      icon: 'clock',
      value: summary.dueCount,
    },
    {
      label: 'Từ thành thạo',
      icon: 'check',
      value: summary.masteredCount,
    },
  ];

  return (
    <div className="dashboard-stats">
      {items.map((item) => (
        <article key={item.label}>
          <div className="stat-icon">
            <Icon name={item.icon} />
          </div>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </article>
      ))}
    </div>
  );
}
