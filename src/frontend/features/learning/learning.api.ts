import { apiRequest } from '../../api/client';
import type {
  LearningAction,
  LearningPreferences,
  LearningResult,
  LearningSession,
} from './learning.types';

interface SessionResponse {
  session: LearningSession;
}

export const learningApi = {
  async active(signal: AbortSignal) {
    const result = await apiRequest<{
      session: LearningSession | null;
    }>('/api/study/learn/active', { signal });

    return result.session;
  },

  async preferences(signal: AbortSignal) {
    const result = await apiRequest<{
      settings: LearningPreferences;
    }>('/api/settings', { signal });

    return result.settings;
  },

  async create(topicId: string, limit: 5 | 10, signal: AbortSignal) {
    const result = await apiRequest<SessionResponse>('/api/study/learn', {
      method: 'POST',
      body: { topicId, limit },
      signal,
    });

    return result.session;
  },

  async createPersonal(entryIds: string[], limit: 5 | 10, signal: AbortSignal) {
    const result = await apiRequest<SessionResponse>(
      '/api/study/personal/learn',
      {
        method: 'POST',
        body: { entryIds, limit },
        signal,
      },
    );
    return result.session;
  },

  async session(sessionId: string, signal: AbortSignal) {
    const result = await apiRequest<SessionResponse>(
      `/api/study/learn/${encodeURIComponent(sessionId)}`,
      { signal },
    );

    return result.session;
  },

  async transition(
    session: LearningSession,
    action: LearningAction,
    answer: string,
    signal: AbortSignal,
  ) {
    const result = await apiRequest<SessionResponse>(
      `/api/study/learn/${encodeURIComponent(session.id)}/action`,
      {
        method: 'POST',
        body: {
          version: session.version,
          action,
          answer,
        },
        signal,
      },
    );

    return result.session;
  },

  submit(session: LearningSession, answer: string, signal: AbortSignal) {
    return apiRequest<LearningResult>(
      `/api/study/learn/${encodeURIComponent(session.id)}/answer`,
      {
        method: 'POST',
        body: {
          version: session.version,
          attemptId: session.attemptId,
          answer,
        },
        signal,
      },
    );
  },
};
