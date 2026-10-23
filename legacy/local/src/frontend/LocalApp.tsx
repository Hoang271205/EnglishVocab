import SiteHeader from './components/SiteHeader';
import type { Tab } from '../../../../src/frontend/components/navigation';
import { useState } from 'react';
import type { SessionView } from '../../../../src/domain/types';
import LearnPage from './features/learn/LearnPage';
import SessionPage from './features/study/SessionPage';
import ReviewPage from './features/review/ReviewPage';
import NotebookPage from './features/notebook/NotebookPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('review');
  const [activeSession, setActiveSession] = useState<SessionView | null>(null);

  function renderPage() {
    switch (activeTab) {
      case 'review':
        return (
          <ReviewPage
            onLearn={() => setActiveTab('learn')}
            onOpenSession={(session) => setActiveSession(session)}
          />
        );

      case 'learn':
        return (
          <LearnPage
            onNotebook={() => setActiveTab('notebook')}
            onOpenSession={(session) => setActiveSession(session)}
          />
        );

      case 'notebook':
        return (
          <NotebookPage
            onLearn={() => setActiveTab('learn')}
            onOpenSession={(session) => setActiveSession(session)}
          />
        );
    }
  }

  if (activeSession) {
    return (
      <div className="app-shell">
        <main className="page-container">
          <SessionPage
            key={activeSession.id}
            session={activeSession}
            onExit={() => {
              setActiveTab(
                activeSession.mode === 'review' ? 'review' : 'learn',
              );
              setActiveSession(null);
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <SiteHeader activeTab={activeTab} onNavigate={setActiveTab} />

      <main className="page-container">{renderPage()}</main>

      <footer className="site-footer">Mỗi ngày một chút, nhớ lâu hơn.</footer>
    </div>
  );
}
