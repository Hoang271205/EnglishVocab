import { Suspense, useEffect, useRef } from 'react';
import LoadingSkeleton from '../ui/LoadingSkeleton';
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
  const main = useRef<HTMLElement>(null);
  const previousNavigation = useRef(navigation);
  useEffect(() => {
    if (
      previousNavigation.current !== navigation &&
      main.current?.contains(document.activeElement) === false
    ) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest('.main-nav'))
        main.current.focus();
    }
    previousNavigation.current = navigation;
  }, [navigation]);
  return (
    <div className="app-shell">
      <a className="workspace-skip" href="#workspace-content">
        Đến nội dung chính
      </a>
      <header
        className={[
          'site-header',
          'online-header',
          navigation ? 'online-header--with-navigation' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="site-header-inner">
          <Brand />

          {navigation}

          <div className="online-account">{account}</div>
        </div>
      </header>

      <main
        className="page-container"
        id="workspace-content"
        ref={main}
        tabIndex={-1}
      >
        <Suspense fallback={<LoadingSkeleton label="Đang tải trang" />}>
          {children}
        </Suspense>
      </main>

      <footer className="site-footer">Mỗi ngày một chút, nhớ lâu hơn.</footer>
    </div>
  );
}
