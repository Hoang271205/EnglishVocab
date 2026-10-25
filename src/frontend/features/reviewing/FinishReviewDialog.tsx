import { useEffect, useId, useRef } from 'react';
import Mascot from '../../components/mascot/Mascot';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';

interface Props {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function FinishReviewDialog({
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    cancelButton.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="finish-review-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description ${id}-note`}
      aria-modal="true"
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="finish-review-dialog-content">
        <button
          className="finish-review-close"
          type="button"
          disabled={busy}
          onClick={onCancel}
          aria-label="Đóng và tiếp tục ôn"
        >
          <Icon name="close" />
        </button>
        <div className="finish-review-scene" aria-hidden="true">
          <span />
          <Mascot compact mood="rest" />
        </div>
        <p className="finish-review-eyebrow">MỖI LẦN ÔN, NHỚ THÊM MỘT CHÚT</p>
        <h2 id={`${id}-title`}>Mình kết thúc lượt ôn nhé?</h2>
        <p className="finish-review-description" id={`${id}-description`}>
          Bạn có thể dừng tại đây và xem kết quả của mình. Những câu đã gửi vẫn
          được giữ lại.
        </p>
        <div className="finish-review-note" id={`${id}-note`}>
          <Icon name="shield" />
          <p>
            Câu chưa gửi sẽ không được chấm. Các từ chưa làm vẫn chờ bạn ở lần
            ôn sau.
          </p>
        </div>
        <div className="finish-review-buttons">
          <button
            ref={cancelButton}
            className="ui-button ui-button--secondary"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            Ôn tiếp
          </button>
          <Button icon="check" loading={busy} onClick={onConfirm}>
            {busy ? 'Đang kết thúc…' : 'Kết thúc lượt ôn'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
