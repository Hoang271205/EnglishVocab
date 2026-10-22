import type { useLearnSession } from './useLearnSession';

export default function LearnRecallCard({
  controller,
}: {
  controller: ReturnType<typeof useLearnSession>;
}) {
  const {
    submitAnswer,
    question,
    answer,
    busy,
    changeAnswer,
    draftState,
    showFrontAgain,
  } = controller;
  if (!question) return null;
  return (
    <form
      className="study-card"
      onSubmit={(event) => {
        event.preventDefault();
        submitAnswer();
      }}
    >
      <p className="eyebrow">NHỚ VÀ VIẾT LẠI</p>

      <p className="study-meaning">{question.meaningVi}</p>

      <p className="word-type">{question.partOfSpeech}</p>

      <label className="answer-label" htmlFor="learn-answer">
        Viết lại từ hoặc cụm từ vừa học
      </label>

      <input
        key={question.attemptId}
        id="learn-answer"
        className="learn-answer"
        type="text"
        value={answer}
        maxLength={10000}
        disabled={busy}
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        onChange={(event) => changeAnswer(event.target.value)}
      />

      <p className="draft-status" role="status">
        {draftState === 'saving'
          ? 'Đang lưu bản nháp…'
          : draftState === 'error'
            ? 'Chưa lưu được bản nháp.'
            : 'Bản nháp đã lưu trên thiết bị.'}
      </p>

      <div className="study-answer-actions">
        <button
          className="primary-button"
          type="submit"
          disabled={busy || !answer.trim()}
        >
          {busy ? 'Đang xử lý…' : 'Kiểm tra'}
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={showFrontAgain}
        >
          Xem lại từ
        </button>
      </div>
    </form>
  );
}
