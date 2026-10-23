import { ServiceError, POLICY } from '../../../../src/domain/types';
import type {
  Clock,
  Entry,
  GradeResult,
  Progress,
  Question,
  Session,
  SessionView,
  SubmitCommand,
} from '../../../../src/domain/types';
import { VocabDB } from '../storage/db';
import { createMask, validateClozeAnswer } from '../../../../src/domain/cloze';
import { gradeAnswer } from '../../../../src/domain/grading';
import { initialProgress, reviewProgress } from '../../../../src/domain/scheduler';
import { readReviewDisabledIds } from './reviewPreferences';

function view(s: Session): SessionView {
  return { ...s, items: s.items.map((i) => ({ attemptId: i.attemptId })) };
}

export class StudyService {
  constructor(
    private readonly db: VocabDB,
    private readonly clock: Clock = { now: () => Date.now() },
    private readonly makeId: () => string = () => crypto.randomUUID(),
  ) {}

  async active(): Promise<SessionView | null> {
    const sessions = await this.db.sessions.toArray();

    const unfinished = sessions
      .filter((session) => session.phase !== 'complete')
      .sort(
        (first, second) =>
          first.createdAt - second.createdAt ||
          first.id.localeCompare(second.id),
      )[0];

    return unfinished ? view(unfinished) : null;
  }

  async saveDraft(
    id: string,
    version: number,
    answer: string,
  ): Promise<SessionView> {
    return this.db.transaction('rw', this.db.sessions, async () => {
      const session = await this.loadSession(id);

      if (session.version !== version) {
        throw new ServiceError(
          'conflict',
          'Phiên đã thay đổi ở tab khác. Hãy tải lại phiên.',
        );
      }

      const canAnswer =
        (session.mode === 'learn' && session.phase === 'recall') ||
        (session.mode === 'review' && session.phase === 'question');

      if (!canAnswer || session.paused) {
        throw new ServiceError(
          'conflict',
          'Phiên hiện không ở bước nhập đáp án.',
        );
      }

      session.draftAnswer = answer.slice(0, 10_000);
      session.version++;

      await this.db.sessions.put(session);

      return view(session);
    });
  }

  async create(
    mode: 'learn' | 'review',
    limit: 5 | 10 | 20,
    entryIds?: string[],
  ): Promise<SessionView> {
    if (
      (mode === 'learn' && ![5, 10].includes(limit)) ||
      (mode === 'review' && ![10, 20].includes(limit))
    ) {
      throw new ServiceError('validation', 'Invalid batch');
    }

    return this.db.transaction(
      'rw',
      this.db.entries,
      this.db.settings,
      this.db.progress,
      this.db.sessions,
      async () => {
        const active = await this.db.sessions.toArray();
        const unfinished = active.find((session) => session.phase !== 'complete');

        if (unfinished) {
          throw new ServiceError(
            'conflict',
            'Resume the unfinished session',
          );
        }

        const all = await this.db.entries.toArray();
        const ready = new Map(
          all
            .filter((entry) => entry.contentStatus === 'ready')
            .map((entry) => [entry.id, entry]),
        );

        const progress = await this.db.progress.toArray();
        const learned = new Map(
          progress.map((item) => [item.entryId, item]),
        );
        const eligible = (
          entryIds ? [...new Set(entryIds)] : [...ready.keys()]
        ).filter((id) => ready.has(id));
        const now = this.clock.now();
        const disabledIds = await readReviewDisabledIds(this.db);

        let selected = eligible.filter((id) =>
          mode === 'learn'
            ? !learned.has(id)
            : !disabledIds.has(id) &&
              (learned.get(id)?.nextReviewAt ?? Infinity) <= now,
        );

        if (mode === 'review') {
          selected = selected.sort(
            (a, b) =>
              learned.get(a)!.nextReviewAt - learned.get(b)!.nextReviewAt ||
              a.localeCompare(b),
          );
        }

        selected = selected.slice(0, limit);

        if (!selected.length) {
          throw new ServiceError('not-found', 'No eligible entries');
        }

        const session: Session = {
          id: this.makeId(),
          mode,
          version: 1,
          index: 0,
          phase: mode === 'learn' ? 'front' : 'question',
          draftAnswer: '',
          paused: false,
          createdAt: now,
          items: selected.map((id) => {
            const entry = ready.get(id)!;
            const example = entry.examples[0];

            if (!example) {
              throw new ServiceError('validation', 'Missing example');
            }

            return {
              entryId: id,
              entryRevision: entry.revision,
              expectedVersion: learned.get(id)?.version ?? 0,
              attemptId: this.makeId(),
              example,
              cells: createMask(example.targetSurface),
            };
          }),
        };

        await this.db.sessions.add(session);
        return view(session);
      },
    );
  }

  private async loadSession(id: string): Promise<Session> {
    const session = await this.db.sessions.get(id);

    if (!session) {
      throw new ServiceError('not-found', 'Session not found');
    }

    return session;
  }

  async session(id: string): Promise<SessionView> {
    return view(await this.loadSession(id));
  }

  async transition(
    id: string,
    version: number,
    action: 'recall' | 'front' | 'next' | 'pause' | 'resume',
    draftAnswer = '',
  ): Promise<SessionView> {
    return this.db.transaction('rw', this.db.sessions, async () => {
      const session = await this.loadSession(id);

      if (session.version !== version) {
        throw new ServiceError(
          'conflict',
          'Session changed in another tab',
        );
      }

      if (action === 'pause') {
        session.paused = true;
        session.draftAnswer = draftAnswer.slice(0, 10_000);
      } else if (action === 'resume') {
        session.paused = false;
      } else if (session.paused) {
        throw new ServiceError('conflict', 'Resume first');
      } else if (
        action === 'recall' &&
        session.mode === 'learn' &&
        session.phase === 'front'
      ) {
        session.phase = 'recall';
      } else if (
        action === 'front' &&
        session.mode === 'learn' &&
        session.phase === 'recall'
      ) {
        session.phase = 'front';
        session.draftAnswer = '';
      } else if (
        action === 'next' &&
        session.mode === 'review' &&
        session.phase === 'feedback'
      ) {
        session.index++;
        session.phase =
          session.index >= session.items.length ? 'complete' : 'question';
        session.draftAnswer = '';
      } else {
        throw new ServiceError('conflict', 'Invalid transition');
      }

      session.version++;
      await this.db.sessions.put(session);
      return view(session);
    });
  }

  async question(id: string): Promise<Question> {
    const session = await this.loadSession(id);
    const item = session.items[session.index];

    if (
      !item ||
      !['recall', 'question'].includes(session.phase) ||
      session.paused
    ) {
      throw new ServiceError('conflict', 'Not answering');
    }

    const entry = await this.db.entries.get(item.entryId);

    if (!entry) {
      throw new ServiceError('not-found', 'Entry missing');
    }

    return {
      attemptId: item.attemptId,
      meaningVi: entry.meaningVi,
      partOfSpeech: entry.partOfSpeech,
      prefix: session.mode === 'review' ? item.example.prefix : '',
      suffix: session.mode === 'review' ? item.example.suffix : '',
      cells: session.mode === 'review' ? item.cells : [],
    };
  }

  async front(id: string): Promise<Entry> {
    const session = await this.loadSession(id);

    if (session.phase !== 'front' || session.paused) {
      throw new ServiceError('conflict', 'Not showing front');
    }

    const item = session.items[session.index];
    const entry = item && (await this.db.entries.get(item.entryId));

    if (!entry) {
      throw new ServiceError('not-found', 'Entry missing');
    }

    return entry;
  }

  async feedback(id: string) {
    return this.db.transaction(
      'r',
      this.db.sessions,
      this.db.entries,
      this.db.events,
      this.db.progress,
      async () => {
        const session = await this.loadSession(id);
        const item = session.items[session.index];

        if (!item || session.phase !== 'feedback') {
          throw new ServiceError(
            'conflict',
            'Feedback is available only after grading',
          );
        }

        const [entry, event, progress] = await Promise.all([
          this.db.entries.get(item.entryId),
          this.db.events.get(item.attemptId),
          this.db.progress.get(item.entryId),
        ]);

        if (!entry || !event || !progress) {
          throw new ServiceError('storage', 'Feedback record missing');
        }

        return { entry, event, progress };
      },
    );
  }

  async submit(
    command: SubmitCommand,
  ): Promise<GradeResult | { kind: 'retry' }> {
    return this.db.transaction(
      'rw',
      this.db.entries,
      this.db.progress,
      this.db.events,
      this.db.sessions,
      async () => {
        const previous = await this.db.events.get(command.attemptId);

        if (previous) {
          if (previous.sessionId !== command.sessionId) {
            throw new ServiceError(
              'conflict',
              'Attempt belongs to a different session',
            );
          }

          const progress = await this.db.progress.get(previous.entryId);

          if (!progress) {
            throw new ServiceError('storage', 'Missing progress');
          }

          return { kind: 'committed', event: previous, progress };
        }

        const session = await this.loadSession(command.sessionId);
        const item = session.items[session.index];

        if (
          !item ||
          session.paused ||
          session.version !== command.expectedSessionVersion ||
          item.attemptId !== command.attemptId ||
          !['recall', 'question'].includes(session.phase)
        ) {
          throw new ServiceError('conflict', 'Stale attempt');
        }

        const entry = await this.db.entries.get(item.entryId);

        if (
          !entry ||
          entry.contentStatus !== 'ready' ||
          entry.revision !== item.entryRevision
        ) {
          throw new ServiceError('conflict', 'Content changed');
        }

        const before = await this.db.progress.get(entry.id);

        if ((before?.version ?? 0) !== item.expectedVersion) {
          throw new ServiceError('conflict', 'Progress changed in another tab');
        }

        if (command.forgotten && session.mode === 'learn') {
          throw new ServiceError(
            'validation',
            'Learning requires a correct rewrite',
          );
        }

        if (session.mode === 'review' && !command.forgotten) {
          validateClozeAnswer(command.answer, item.cells);
        }

        const correct = command.forgotten
          ? false
          : gradeAnswer(
              command.answer,
              session.mode === 'learn'
                ? entry.acceptedLearnAnswers
                : item.example.acceptedAnswers,
            );

        if (!correct && session.mode === 'learn') {
          return { kind: 'retry' };
        }

        const now = this.clock.now();

        if (
          session.mode === 'review' &&
          (!before || before.nextReviewAt > now)
        ) {
          throw new ServiceError('conflict', 'Word is not due');
        }

        const progress: Progress =
          session.mode === 'learn'
            ? initialProgress(entry.id, now)
            : reviewProgress(before!, correct, now);

        const event = {
          id: item.attemptId,
          sessionId: session.id,
          entryId: entry.id,
          mode: session.mode,
          correct,
          reviewedAt: now,
          beforeLevel: before?.level ?? null,
          afterLevel: progress.level,
          nextReviewAt: progress.nextReviewAt,
          entryRevision: entry.revision,
          policy: POLICY,
        };

        await this.db.progress.put(progress);
        await this.db.events.add(event);

        if (session.mode === 'learn') {
          session.index++;
          session.phase =
            session.index >= session.items.length ? 'complete' : 'front';
        } else {
          session.phase = 'feedback';
        }

        session.version++;
        session.draftAnswer = '';
        await this.db.sessions.put(session);

        return { kind: 'committed', event, progress };
      },
    );
  }
}