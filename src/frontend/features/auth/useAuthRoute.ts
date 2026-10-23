import { useEffect, useState } from 'react';
export type AuthRoute =
  'login' | 'register' | 'forgot-password' | 'reset-password';
function readRoute() {
  const [path, query] = window.location.hash.slice(1).split('?');
  const name = path?.replace(/^\//, '');
  const page: AuthRoute =
    name === 'register' ||
    name === 'forgot-password' ||
    name === 'reset-password'
      ? name
      : 'login';
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
