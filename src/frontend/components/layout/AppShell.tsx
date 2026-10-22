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
          navigation
            ? 'online-header--with-navigation'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="brand">
          <span aria-hidden="true">🌱</span>
          EnglishVocab
        </div>

        {navigation}

        <div className="online-account">
          {account}
        </div>
      </header>

      <main className="page-container">
        {children}
      </main>

      <footer className="site-footer">
        Mỗi ngày một chút, nhớ lâu hơn.
      </footer>
    </div>
  );
}