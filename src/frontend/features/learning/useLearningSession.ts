import {
  clearStudyDraft,
  restoreStudyDraft,
  saveStudyDraft,
} from '../studyDraft';
import { announceFeedback } from '../../audio/experience';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { learningApi } from './learning.api';
import type { LearningAction, LearningSession } from './learning.types';

export function useLearningSession(
  sessionId: string,
  onExit: () => void,
  ownerId: string,
) {
  const [session, setSession] = useState<LearningSession | null>(null);

  const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const action = useAsyncAction();

  const load = useCallback(
    (signal: AbortSignal) => learningApi.session(sessionId, signal),
    [sessionId],
  );

  const resource = useAsyncResource(load);

  function identity(next: LearningSession) {
    return {
      ownerId,
      sessionId: next.id,
      attemptId: next.attemptId ?? '',
      version: next.version,
      phase: next.phase,
    };
  }

  function changeAnswer(value: string) {
    setAnswer(value);
    if (session?.phase === 'recall') saveStudyDraft(identity(session), value);
  }

  function apply(next: LearningSession) {
    clearStudyDraft(identity(next));
    setSession(next);
    setAnswer(next.draftAnswer);
  }

  useEffect(() => {
    if (resource.data) {
      setSession(resource.data);
      const saved =
        resource.data.phase === 'recall'
          ? restoreStudyDraft({
              ownerId,
              sessionId: resource.data.id,
              attemptId: resource.data.attemptId ?? '',
              version: resource.data.version,
              phase: resource.data.phase,
            })
          : null;
      setAnswer(saved ?? resource.data.draftAnswer);
      if (saved !== null)
        setNotice('Đã khôi phục câu trả lời trên thiết bị này.');
    }
  }, [resource.data, ownerId]);

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
      if (next.phase === 'complete' && next.total > next.skippedCount)
        announceFeedback('complete', `learn-complete:${next.id}`);

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
      announceFeedback(
        'retry',
        `learn-retry:${session.attemptId}:${Date.now()}`,
      );
      setNotice('Chưa đúng. Bạn thử viết lại nhé.');
      return;
    }

    apply(result.session);
    announceFeedback(
      result.session.phase === 'complete' ? 'complete' : 'correct',
      `learn-answer:${result.event.id}`,
    );

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
    slow: action.slow,
    needsReload,
    error: action.error?.message ?? resource.error,
    setAnswer: changeAnswer,
    transition,
    submit,
    exit,
    reload,
  };
}
