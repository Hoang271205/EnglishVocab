import Brand from '../ui/Brand';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  account: ReactNode;
  navigation?: ReactNode;
}

export default function AppShell({
  children,
  account,
  navigation,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header
        className={[
          'site-header',
          'online-header',
          navigation ? 'online-header--with-navigation' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Brand />

        {navigation}

        <div className="online-account">{account}</div>
      </header>

      <main className="page-container">{children}</main>

      <footer className="site-footer">Mỗi ngày một chút, nhớ lâu hơn.</footer>
    </div>
  );
}
