import type { DashboardSummary } from './dashboard.types';

interface DashboardStatsProps {
  summary: DashboardSummary;
}

export default function DashboardStats({ summary }: DashboardStatsProps) {
  const items = [
    {
      label: 'Từ đã học',
      value: summary.learnedCount,
    },
    {
      label: 'Từ ở Level 5',
      value: summary.masteredCount,
    },
  ];

  return (
    <dl className="dashboard-totals" aria-label="Tiến độ tích lũy">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value.toLocaleString('vi-VN')}</dd>
        </div>
      ))}
    </dl>
  );
}
