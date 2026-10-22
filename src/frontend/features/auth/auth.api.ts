import { apiRequest } from '../../api/client';
import type {
  AuthUserResponse,
  LoginCredentials,
} from './auth.types';

export const authApi = {
  async currentUser(signal?: AbortSignal) {
    const result = await apiRequest<AuthUserResponse>(
      '/api/auth/me',
      signal ? { signal } : {},
    );

    return result.user;
  },

  async login(credentials: LoginCredentials) {
    const result = await apiRequest<AuthUserResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: {
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        },
      },
    );

    return result.user;
  },

  logout() {
    return apiRequest<void>('/api/auth/logout', {
      method: 'POST',
      body: {},
    });
  },
};