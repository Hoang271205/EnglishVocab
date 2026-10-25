import { announceFeedback } from '../../audio/experience';
import { useCallback, useEffect, useState } from 'react';
import { assembleAnswer } from '../../../domain/cloze';
import { ApiError } from '../../api/client';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { reviewApi } from './review.api';
import { createDraft, isComplete, restoreLetters } from './reviewAnswers';
import type { OnlineReviewSession, ReviewAction } from './review.types';

export function useOnlineReviewSession(sessionId: string, onExit: () => void) {
  const [session, setSession] = useState<OnlineReviewSession | null>(null);

  const [letters, setLetters] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [finishConfirmationOpen, setFinishConfirmationOpen] = useState(false);

  const action = useAsyncAction();

  const load = useCallback(
    (signal: AbortSignal) => reviewApi.session(sessionId, signal),
    [sessionId],
  );

  const resource = useAsyncResource(load);

  function apply(next: OnlineReviewSession) {
    setSession(next);
    setLetters(
      next.question
        ? restoreLetters(next.question.cells, next.draftAnswer)
        : [],
    );
  }

  useEffect(() => {
    if (resource.data) {
      apply(resource.data);
    }
  }, [resource.data]);

  const needsReload =
    action.error instanceof ApiError &&
    (action.error.status === 0 ||
      action.error.status === 409 ||
      action.error.status >= 500);

  const busy = action.busy || resource.loading;

  const blocked = busy || needsReload || resource.error !== null;

  const canSubmit =
    session?.question !== null &&
    session?.question !== undefined &&
    isComplete(session.question.cells, letters);

  function draft() {
    return session?.question
      ? createDraft(session.question.cells, letters)
      : '';
  }

  async function transition(type: ReviewAction) {
    if (!session || blocked) return;

    setNotice(null);

    const next = await action.run((signal) =>
      reviewApi.transition(session, type, draft(), signal),
    );

    if (next) {
      apply(next);
      if (next.phase === 'complete' && (next.reviewedCount ?? 0) > 0)
        announceFeedback('complete', `review-complete:${next.id}`);

      if (type === 'draft') {
        setNotice('Bản nháp đã lưu.');
      }
    }
  }

  async function submit(forgotten = false) {
    if (!session?.question || blocked || (!forgotten && !canSubmit)) {
      return;
    }

    const answer = forgotten
      ? ''
      : assembleAnswer(session.question.cells, letters, true);

    setNotice(null);

    const result = await action.run((signal) =>
      reviewApi.submit(session, answer, forgotten, signal),
    );

    if (result) {
      apply(result.session);
      announceFeedback(
        result.event.correct ? 'correct' : 'retry',
        `review-answer:${result.event.id}`,
      );
    }
  }

  function requestFinish() {
    if (!session || blocked || session.phase === 'complete') return;
    setFinishConfirmationOpen(true);
  }

  function cancelFinish() {
    if (!busy) setFinishConfirmationOpen(false);
  }

  async function finish() {
    if (
      !finishConfirmationOpen ||
      !session ||
      blocked ||
      session.phase === 'complete'
    )
      return;
    await transition('finish');
    // On errors, expose the existing reload/retry UI rather than hiding it behind the dialog.
    setFinishConfirmationOpen(false);
  }

  async function exit() {
    if (!session || blocked) return;

    if (session.paused || session.phase === 'complete') {
      onExit();
      return;
    }

    const next = await action.run((signal) =>
      reviewApi.transition(session, 'pause', draft(), signal),
    );

    if (next) onExit();
  }

  function reload() {
    action.clearError();
    setNotice(null);
    resource.reload();
  }

  return {
    session,
    letters,
    notice,
    busy,
    blocked,
    canSubmit,
    needsReload,
    error: action.error?.message ?? resource.error,
    setLetters,
    transition,
    submit,
    finish,
    requestFinish,
    cancelFinish,
    finishConfirmationOpen,
    exit,
    reload,
  };
}
