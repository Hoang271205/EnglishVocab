import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { learningApi } from './learning.api';
import type { LearningAction, LearningSession } from './learning.types';

export function useLearningSession(sessionId: string, onExit: () => void) {
  const [session, setSession] = useState<LearningSession | null>(null);

  const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const action = useAsyncAction();

  const load = useCallback(
    (signal: AbortSignal) => learningApi.session(sessionId, signal),
    [sessionId],
  );

  const resource = useAsyncResource(load);

  function apply(next: LearningSession) {
    setSession(next);
    setAnswer(next.draftAnswer);
  }

  useEffect(() => {
    if (resource.data) {
      setSession(resource.data);
      setAnswer(resource.data.draftAnswer);
    }
  }, [resource.data]);

  const needsReload =
    action.error instanceof ApiError &&
    (action.error.status === 0 ||
      action.error.status === 409 ||
      action.error.status >= 500);

  const busy = action.busy || resource.loading;

  async function transition(type: LearningAction) {
    if (!session || busy || needsReload || resource.error) return;

    setNotice(null);

    const next = await action.run((signal) =>
      learningApi.transition(session, type, answer, signal),
    );

    if (next) {
      apply(next);

      if (type === 'draft') {
        setNotice('Bản nháp đã lưu.');
      } else if (type === 'skip') {
        setNotice(
          'Đã đánh dấu biết từ này. Từ sẽ không xuất hiện trong lượt học mới.',
        );
      }
    }
  }

  async function submit() {
    if (!session || !session.attemptId || !answer.trim() || needsReload) {
      return;
    }

    setNotice(null);

    const result = await action.run((signal) =>
      learningApi.submit(session, answer, signal),
    );

    if (!result) return;

    if (result.kind === 'retry') {
      setNotice('Chưa đúng. Bạn thử viết lại nhé.');
      return;
    }

    apply(result.session);

    const nextReview = new Date(result.progress.nextReviewAt).toLocaleString(
      'vi-VN',
    );

    setNotice(`Đã lưu level 1. Lần ôn tiếp theo: ${nextReview}.`);
  }

  async function exit() {
    if (!session || busy || needsReload) return;

    if (session.phase === 'complete' || session.paused) {
      onExit();
      return;
    }

    const next = await action.run((signal) =>
      learningApi.transition(session, 'pause', answer, signal),
    );

    if (next) {
      onExit();
    }
  }

  function reload() {
    action.clearError();
    setNotice(null);
    resource.reload();
  }

  return {
    session,
    answer,
    notice,
    busy,
    needsReload,
    error: action.error?.message ?? resource.error,
    setAnswer,
    transition,
    submit,
    exit,
    reload,
  };
}
