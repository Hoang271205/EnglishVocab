import { useCallback, useState } from 'react';

import { requestWorker } from '../client';

import { useAsyncAction } from '../../src/frontend/hooks/useAsyncAction';

import { useAsyncResource } from '../../src/frontend/hooks/useAsyncResource';

import type { ExtensionCredentials, ExtensionUser } from '../accountApi';

export function useAccount() {
  const action = useAsyncAction();

  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (_signal: AbortSignal) => {
    const result = await requestWorker<{
      user: ExtensionUser | null;
    }>({
      type: 'auth-status',
    });

    return result;
  }, []);

  const resource = useAsyncResource(load);

  async function login(credentials: ExtensionCredentials) {
    setNotice(null);

    const result = await action.run(() =>
      requestWorker<{ user: ExtensionUser }>({
        type: 'auth-login',
        email: credentials.email,
        password: credentials.password,
      }),
    );

    if (result) {
      setNotice('Đã đăng nhập. Bạn có thể quay lại bài đọc để lưu từ.');

      resource.reload();
    }
  }

  async function logout() {
    setNotice(null);

    const result = await action.run(() =>
      requestWorker<{
        warning: string | null;
      }>({
        type: 'auth-logout',
      }),
    );

    if (result) {
      setNotice(result.warning ?? 'Đã đăng xuất extension.');

      resource.reload();
    }
  }

  return {
    user: resource.data?.user ?? null,
    loading: resource.loading,
    busy: action.busy,
    error: action.error?.message ?? resource.error,
    notice,
    login,
    logout,
    reload: resource.reload,
  };
}
