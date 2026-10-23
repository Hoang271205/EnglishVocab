import { apiRequest } from '../../api/client';
import type {
  OnlineReviewSession,
  ReviewAction,
  ReviewBatchSize,
  ReviewCollection,
  ReviewResult,
} from './review.types';

interface SessionResponse {
  session: OnlineReviewSession;
}

export const reviewApi = {
  async active(signal: AbortSignal) {
    const result = await apiRequest<{
      session: OnlineReviewSession | null;
    }>('/api/study/review/active', { signal });

    return result.session;
  },

  async batchSize(signal: AbortSignal) {
    const result = await apiRequest<{
      settings: {
        reviewBatchSize: ReviewBatchSize;
      };
    }>('/api/settings', { signal });

    return result.settings.reviewBatchSize;
  },

  async create(
    collection: ReviewCollection,
    limit: ReviewBatchSize,
    signal: AbortSignal,
  ) {
    const result = await apiRequest<SessionResponse>('/api/study/review', {
      method: 'POST',
      body: {
        limit,
        ...(collection === 'all' ? {} : { collection }),
      },
      signal,
    });

    return result.session;
  },

  async session(id: string, signal: AbortSignal) {
    const result = await apiRequest<SessionResponse>(
      `/api/study/review/${encodeURIComponent(id)}`,
      { signal },
    );

    return result.session;
  },

  async transition(
    session: OnlineReviewSession,
    action: ReviewAction,
    answer: string,
    signal: AbortSignal,
  ) {
    const result = await apiRequest<SessionResponse>(
      `/api/study/review/${encodeURIComponent(session.id)}/action`,
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

    // Refresh the view so disabled words in an older session can be skipped.
    return this.session(result.session.id, signal);
  },

  submit(
    session: OnlineReviewSession,
    answer: string,
    forgotten: boolean,
    signal: AbortSignal,
  ) {
    return apiRequest<ReviewResult>(
      `/api/study/review/${encodeURIComponent(session.id)}/answer`,
      {
        method: 'POST',
        body: {
          version: session.version,
          attemptId: session.question?.attemptId,
          answer,
          forgotten,
        },
        signal,
      },
    );
  },
};
