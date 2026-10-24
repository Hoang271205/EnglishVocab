import { Suspense, useState } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import type { ReactNode } from 'react';
export default function ExpandablePanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="cloud-tool"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{title}</summary>
      {open && (
        <Suspense fallback={<LoadingSkeleton label="Đang tải công cụ" />}>
          {children}
        </Suspense>
      )}
    </details>
  );
}
