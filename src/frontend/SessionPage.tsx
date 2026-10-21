import { useState } from 'react';
import type { SessionView } from '../domain/types';
import { backend } from './backend';

type SessionPageProps = {
  session: SessionView;
  onExit: () => void;
};

const phaseLabels: Record<SessionView['phase'], string> = {
  front: 'Xem từ',
  recall: 'Viết lại',
  question: 'Trả lời câu hỏi',
  feedback: 'Xem kết quả',
  complete: 'Hoàn tất',
};

export default function SessionPage({
  session,
  onExit,
}: SessionPageProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pauseSession() {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    backend.audio.stop();

    try {
      await backend.study.transition(
        session.id,
        session.version,
        'pause',
        session.draftAnswer,
      );

      onExit();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Không tạm dừng được phiên học.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="session-page" aria-labelledby="session-title">
      <p className="eyebrow">
        {session.mode === 'learn' ? 'HỌC TỪ MỚI' : 'ÔN TẬP'}
      </p>

      <h1 id="session-title">
        {session.mode === 'learn' ? 'Phiên học của bạn' : 'Phiên ôn của bạn'}
      </h1>

      <div className="session-summary">
        <p>
          Số từ trong phiên: <strong>{session.items.length}</strong>
        </p>

        <p>
          Đã hoàn thành: <strong>{session.index}</strong>/
          {session.items.length}
        </p>

        <p>
          Bước hiện tại: <strong>{phaseLabels[session.phase]}</strong>
        </p>

        <progress
          className="session-progress"
          max={Math.max(session.items.length, 1)}
          value={session.index}
          aria-label="Tiến độ phiên học"
        />
      </div>

      {error && (
        <div className="load-error" role="alert">
          {error}
        </div>
      )}

      <button
        className="primary-button"
        type="button"
        disabled={busy}
        onClick={() => void pauseSession()}
      >
        {busy ? 'Đang lưu…' : 'Tạm dừng và quay lại'}
      </button>
    </section>
  );
}
