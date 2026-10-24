import { useEffect, useState } from 'react';
export type AuthRoute =
  'login' | 'register' | 'forgot-password' | 'reset-password' | 'not-found';
function readRoute() {
  const route = window.location.hash
    ? window.location.hash.slice(1)
    : window.location.pathname === '/index.html'
      ? '/'
      : window.location.pathname;
  const [path, query] = route.split('?');
  const name = path?.replace(/^\//, '');
  const page: AuthRoute =
    name === 'register' ||
    name === 'forgot-password' ||
    name === 'reset-password'
      ? name
      : !name || name === 'login'
        ? 'login'
        : 'not-found';
  return { page, token: new URLSearchParams(query).get('token') ?? '' };
}
export function useAuthRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
