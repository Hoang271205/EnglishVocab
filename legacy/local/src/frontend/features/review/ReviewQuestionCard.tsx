import type { useReviewSession } from './useReviewSession';
import ClozeInputs from '../../../../../../src/frontend/components/study/ClozeInputs';

export default function ReviewQuestionCard({
  controller,
}: {
  controller: ReturnType<typeof useReviewSession>;
}) {
  const { submitReview, question, letters, busy, changeLetters, draftState } =
    controller;
  if (!question) return null;
  return (
    <form
      className="study-card"
      onSubmit={(event) => {
        event.preventDefault();
        submitReview();
      }}
    >
      <p className="eyebrow">ĐIỀN CHỮ CÒN THIẾU</p>

      <p className="study-meaning">{question.meaningVi}</p>

      <p className="word-type">{question.partOfSpeech}</p>

      <p className="review-sentence">
        {question.prefix}
        <ClozeInputs
          key={question.attemptId}
          cells={question.cells}
          values={letters}
          disabled={busy}
          onChange={changeLetters}
        />
        {question.suffix}
      </p>

      <p className="draft-status" role="status">
        {draftState === 'saving'
          ? 'Đang lưu bản nháp…'
          : draftState === 'error'
            ? 'Chưa lưu được bản nháp.'
            : 'Bản nháp đã lưu trên thiết bị.'}
      </p>

      <div className="study-answer-actions">
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? 'Đang chấm…' : 'Kiểm tra'}
        </button>

        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => submitReview(true)}
        >
          Không nhớ
        </button>
      </div>
    </form>
  );
}
