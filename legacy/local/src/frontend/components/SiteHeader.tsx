import { navigation } from '../../../../../src/frontend/components/navigation';
import type { Tab } from '../../../../../src/frontend/components/navigation';

type SiteHeaderProps = {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
};

export default function SiteHeader({ activeTab, onNavigate }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a
        className="brand"
        href="#"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('review');
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
              onClick={() => onNavigate(item.id)}
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
  );
}
