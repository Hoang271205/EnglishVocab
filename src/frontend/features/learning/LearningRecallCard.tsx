import Mascot from '../../components/mascot/Mascot';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';

interface LearningRecallCardProps {
  meaningVi: string;
  partOfSpeech: string;
  answer: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onShowFront: () => void;
  onSaveDraft: () => void;
}

export default function LearningRecallCard({
  meaningVi,
  partOfSpeech,
  answer,
  busy,
  onChange,
  onSubmit,
  onShowFront,
  onSaveDraft,
}: LearningRecallCardProps) {
  return (
    <form
      className="study-card"
      onSubmit={(event) => {
        event.preventDefault();

        if (!busy && answer.trim()) {
          onSubmit();
        }
      }}
    >
      <Mascot
        compact
        className="study-mascot"
        mood="thinking"
        message="Thử nhớ và viết lại từ vừa học nhé!"
      />
      <p className="eyebrow">NHỚ VÀ VIẾT LẠI</p>
      <p className="study-meaning">{meaningVi}</p>
      <p className="word-type">{partOfSpeech}</p>

      <FormField
        label="Viết lại từ hoặc cụm từ vừa học"
        type="text"
        value={answer}
        onChange={(event) => onChange(event.target.value)}
        maxLength={1000}
        disabled={busy}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
      />

      <div className="study-answer-actions">
        <Button type="submit" loading={busy} disabled={!answer.trim()}>
          Kiểm tra
        </Button>

        <Button variant="secondary" disabled={busy} onClick={onSaveDraft}>
          Lưu nháp
        </Button>

        <Button variant="secondary" disabled={busy} onClick={onShowFront}>
          Xem lại từ
        </Button>
      </div>
    </form>
  );
}
