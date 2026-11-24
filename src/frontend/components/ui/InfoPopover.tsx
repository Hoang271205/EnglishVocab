import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

const explanations = {
  Level:
    'Level 1–5 thể hiện mức ghi nhớ của bạn qua học và ôn. Đây không phải trình độ tiếng Anh. Level 5 vẫn cần ôn duy trì.',
  CEFR: 'CEFR A1–C2 mô tả độ khó ngôn ngữ của từ, không phải điểm học của bạn. Nhãn “tham khảo” hoặc “ước lượng” chưa phải mức được xác thực.',
};

export default function InfoPopover({
  term,
}: {
  term: keyof typeof explanations;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    if (!open || !panel.current) return;
    const element = panel.current;
    const rect = element.getBoundingClientRect();
    const anchor = trigger.current?.getBoundingClientRect();
    if (
      rect.bottom > window.innerHeight - 16 &&
      anchor &&
      anchor.top >= rect.height + 24
    ) {
      element.style.top = 'auto';
      element.style.bottom = 'calc(100% + 8px)';
    }
    const shift =
      rect.left < 16
        ? 16 - rect.left
        : rect.right > window.innerWidth - 16
          ? window.innerWidth - 16 - rect.right
          : 0;
    if (shift) {
      element.style.left = `${element.offsetLeft + shift}px`;
      element.style.right = 'auto';
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    const dismiss = () => setOpen(false);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  return (
    <span
      className="info-popover"
      ref={container}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="info-popover-trigger"
        type="button"
        aria-label={`Giải thích ${term}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open && (
        <span
          ref={panel}
          className="info-popover-panel"
          id={id}
          role="region"
          aria-label={`Về ${term}`}
        >
          <strong>{term}</strong>
          <span>{explanations[term]}</span>
          <button type="button" className="info-popover-close" onClick={close}>
            Đóng giải thích
          </button>
        </span>
      )}
    </span>
  );
}
