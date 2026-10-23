import Icon from './ui/Icon';
import { navigation } from './navigation';
import type { Tab } from './navigation';

interface MainNavigationProps {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
  items?: ReadonlyArray<(typeof navigation)[number]>;
}

export default function MainNavigation({
  activeTab,
  onNavigate,
  items = navigation,
}: MainNavigationProps) {
  return (
    <nav className="main-nav" aria-label="Điều hướng chính">
      {items.map((item) => {
        const active = activeTab === item.id;

        return (
          <button
            key={item.id}
            className={`nav-item${active ? ' is-active' : ''}`}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon name={item.icon} />
            </span>

            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
