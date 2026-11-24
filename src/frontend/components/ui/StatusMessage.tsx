import type { ReactNode } from 'react';
import Icon from './Icon';

interface StatusMessageProps {
  children: ReactNode;
  tone?: 'error' | 'info' | 'success';
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
      aria-atomic="true"
    >
      {tone === 'success' ? (
        <>
          <Icon name="check" className="save-success-icon" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </p>
  );
}
