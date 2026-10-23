import { apiRequest } from '../../api/client';
import type { AuthUserResponse, LoginCredentials } from './auth.types';

export const authApi = {
  async currentUser(signal?: AbortSignal) {
    const result = await apiRequest<AuthUserResponse>(
      '/api/auth/me',
      signal ? { signal } : {},
    );

    return result.user;
  },

  async login(credentials: LoginCredentials) {
    const result = await apiRequest<AuthUserResponse>('/api/auth/login', {
      method: 'POST',
      body: {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      },
    });

    return result.user;
  },

  async register(credentials: {
    name: string;
    email: string;
    password: string;
  }) {
    const result = await apiRequest<AuthUserResponse>('/api/auth/register', {
      method: 'POST',
      body: credentials,
    });
    return result.user;
  },
  forgotPassword(email: string) {
    return apiRequest<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },
  resetPassword(token: string, password: string) {
    return apiRequest<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  },
  logout() {
    return apiRequest<void>('/api/auth/logout', {
      method: 'POST',
      body: {},
    });
  },
};
