import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
}

export default function AuthLayout({
  title,
  children,
}: AuthLayoutProps) {
  return (
    <main className="login-page">
      <section
        className="login-panel"
        aria-labelledby="auth-title"
      >
        <header className="login-topbar">
          <h1 id="auth-title">{title}</h1>
        </header>

        <div className="login-content">
          {children}
        </div>
      </section>
    </main>
  );
}