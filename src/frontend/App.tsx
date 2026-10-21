import { useState } from 'react';
import type { SessionView } from '../domain/types';
import LearnPage from './LearnPage';
import SessionPage from './SessionPage';

type Tab = 'review' | 'learn' | 'notebook';

const navigation: { id: Tab; label: string; icon: string }[] = [
  { id: 'review', label: 'Ôn tập', icon: '▥' },
  { id: 'learn', label: 'Học từ mới', icon: '♧' },
  { id: 'notebook', label: 'Sổ tay', icon: '▤' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('review');
  const [activeSession, setActiveSession] =
    useState<SessionView | null>(null);

  function renderPage() {
    switch (activeTab) {
      case 'review':
        return <ReviewPage onLearn={() => setActiveTab('learn')} />;

      case 'learn':
        return (
          <LearnPage
            onNotebook={() => setActiveTab('notebook')}
            onOpenSession={(session) => setActiveSession(session)}
          />
        );

      case 'notebook':
        return <NotebookPage onLearn={() => setActiveTab('learn')} />;
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
              setActiveSession(null);
              setActiveTab('learn');
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setActiveTab('review');
          }}
        >
          <span aria-hidden="true">🌱</span>
          <span>EnglishVocab</span>
        </a>

        <nav className="main-nav" aria-label="Điều hướng chính">
          {navigation.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                className={`nav-item${isActive ? ' is-active' : ''}`}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="personal-label">Của riêng bạn</div>
      </header>

      <main className="page-container">{renderPage()}</main>

      <footer className="site-footer">
        Mỗi ngày một chút, nhớ lâu hơn.
      </footer>
    </div>
  );
}

function ReviewPage({ onLearn }: { onLearn: () => void }) {
  return (
    <section className="empty-state" aria-labelledby="review-title">
      <div className="empty-illustration" aria-hidden="true">
        📖
      </div>
      <p className="eyebrow">ÔN TẬP MỖI NGÀY</p>
      <h1 id="review-title">Một chút mỗi ngày, thêm nhiều từ mới</h1>
      <p className="page-description">
        Học từ theo chủ đề và quay lại ôn khi đến hạn.
      </p>
      <button className="primary-button" type="button" onClick={onLearn}>
        Học từ mới
      </button>
    </section>
  );
}

function NotebookPage({ onLearn }: { onLearn: () => void }) {
  return (
    <section className="empty-state" aria-labelledby="notebook-title">
      <div className="empty-illustration" aria-hidden="true">
        📒
      </div>
      <p className="eyebrow">SỔ TAY CỦA BẠN</p>
      <h1 id="notebook-title">Từ đã học sẽ xuất hiện ở đây</h1>
      <p className="page-description">
        Bắt đầu học từ mới để tạo sổ tay từ vựng của riêng bạn.
      </p>
      <button className="primary-button" type="button" onClick={onLearn}>
        Khám phá chủ đề
      </button>
    </section>
  );
}
