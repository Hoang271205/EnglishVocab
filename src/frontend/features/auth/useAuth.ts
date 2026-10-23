import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  API_UNAUTHORIZED_EVENT,
  getErrorMessage,
} from '../../api/client';
import { authApi } from './auth.api';
import type { AuthUser, LoginCredentials } from './auth.types';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    function handleUnauthorized() {
      setUser(null);
    }

    window.addEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);

    async function restoreSession() {
      try {
        const restoredUser = await authApi.currentUser(controller.signal);

        if (!controller.signal.aborted) {
          setUser(restoredUser);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;

        const unauthenticated =
          cause instanceof ApiError && cause.status === 401;

        if (!unauthenticated) {
          setError(getErrorMessage(cause));
        }
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      }
    }

    void restoreSession();

    return () => {
      controller.abort();

      window.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  async function login(credentials: LoginCredentials): Promise<boolean> {
    if (actionLock.current) return false;

    actionLock.current = true;
    setBusy(true);
    setError(null);

    try {
      const loggedInUser = await authApi.login(credentials);
      setUser(loggedInUser);
      return true;
    } catch (cause) {
      setError(getErrorMessage(cause));
      return false;
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function logout() {
    if (actionLock.current) return;

    actionLock.current = true;
    setBusy(true);
    setError(null);

    try {
      await authApi.logout();
      window.speechSynthesis?.cancel();
      setUser(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  return {
    user,
    checking,
    busy,
    error,
    login,
    logout,
  };
}
