import type { ReactNode } from 'react';

interface StatusMessageProps {
  children: ReactNode;
  tone?: 'error' | 'info';
  id?: string;
}

export default function StatusMessage({
  children,
  tone = 'info',
  id,
}: StatusMessageProps) {
  return (
    <p
      id={id}
      className={`ui-message ui-message--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}