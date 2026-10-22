import type { DashboardSummary } from './dashboard.types';

interface DashboardStatsProps {
  summary: DashboardSummary;
}

export default function DashboardStats({
  summary,
}: DashboardStatsProps) {
  const items = [
    {
      label: 'Từ đã học',
      value: summary.learnedCount,
    },
    {
      label: 'Từ đến hạn',
      value: summary.dueCount,
    },
    {
      label: 'Từ thành thạo',
      value: summary.masteredCount,
    },
  ];

  return (
    <div className="dashboard-stats">
      {items.map((item) => (
        <article key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </article>
      ))}
    </div>
  );
}