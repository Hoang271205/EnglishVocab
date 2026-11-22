import Mascot from '../../components/mascot/Mascot';
import type { Question } from '../../../domain/types';
import Button from '../../components/ui/Button';
import ClozeInputs from '../../components/study/ClozeInputs';

interface ReviewQuestionCardProps {
  question: Question;
  letters: string[];
  disabled: boolean;
  working?: boolean;
  canSubmit: boolean;
  onChange: (letters: string[]) => void;
  onSubmit: () => void;
  onForgotten: () => void;
  onSaveDraft: () => void;
}

export default function ReviewQuestionCard({
  question,
  letters,
  disabled,
  working = false,
  canSubmit,
  onChange,
  onSubmit,
  onForgotten,
  onSaveDraft,
}: ReviewQuestionCardProps) {
  return (
    <form
      className="study-card"
      aria-busy={working || undefined}
      onSubmit={(event) => {
        event.preventDefault();

        if (!disabled && canSubmit) {
          onSubmit();
        }
      }}
    >
      <Mascot
        compact
        className="study-mascot"
        mood="thinking"
        message="Thử điền các chữ còn thiếu nhé!"
      />
      <p className="eyebrow">ĐIỀN CÁC CHỮ CÒN THIẾU</p>

      <p className="study-meaning">{question.meaningVi}</p>

      <p className="word-type">{question.partOfSpeech}</p>

      <div className="cloze-sentence">
        {question.prefix}

        <ClozeInputs
          cells={question.cells}
          values={letters}
          disabled={disabled}
          onChange={onChange}
        />

        {question.suffix}
      </div>

      <div className="study-answer-actions">
        <Button
          type="submit"
          disabled={disabled || !canSubmit}
          loading={working}
        >
          {working ? 'Đang xử lý…' : 'Kiểm tra'}
        </Button>

        <Button variant="secondary" disabled={disabled} onClick={onForgotten}>
          Không nhớ
        </Button>

        <Button variant="ghost" disabled={disabled} onClick={onSaveDraft}>
          Lưu nháp
        </Button>
      </div>
    </form>
  );
}
