import { useEffect, useState } from 'react';
import type { Tab } from '../../components/navigation';

function currentTab(): Tab {
  const value = new URL(window.location.href).searchParams.get('tab');
  return value === 'learn' || value === 'notebook' || value === 'settings'
    ? value
    : 'review';
}
export function useWorkspaceTab() {
  const [tab, setTab] = useState<Tab>(currentTab);
  useEffect(() => {
    const restore = () => setTab(currentTab());
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  function navigate(next: Tab) {
    const url = new URL(window.location.href);
    if (currentTab() !== next) {
      url.searchParams.set('tab', next);
      window.history.pushState(window.history.state, '', url);
    }
    setTab(next);
  }
  return [tab, navigate] as const;
}
