export function cacheScope(key: string): string {
  if (key.startsWith('/api/')) {
    const path = key.split('?')[0]!;
    if (path === '/api/progress/summary') return 'dashboard';
    if (path.startsWith('/api/library/topic-summaries')) return 'topics';
    if (path.startsWith('/api/library/')) return 'catalogue';
    return path.split('/')[2] ?? key;
  }
  const prefix = key.split(':')[0]!;
  return prefix === 'topic-entries' ? 'catalogue' : prefix;
}
