import { useEffect, useId, useRef, useState } from 'react';
import Mascot from './Mascot';
import Icon from '../ui/Icon';

export interface GuideStep {
  title: string;
  text: string;
}

export default function GuideDock({ steps }: { steps: GuideStep[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) closeButton.current?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  const current = steps[Math.min(step, steps.length - 1)];
  if (!current) return null;
  return (
    <aside
      className="guide-dock"
      aria-label="Hướng dẫn sử dụng"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          close();
        }
      }}
    >
      {open && (
        <section
          className="guide-popover"
          id={id}
          aria-labelledby={`${id}-title`}
        >
          <button
            ref={closeButton}
            className="guide-close"
            type="button"
            aria-label="Đóng hướng dẫn"
            onClick={close}
          >
            <Icon name="close" />
          </button>
          <p className="eyebrow">MÌNH CÙNG KHÁM PHÁ</p>
          <h2 id={`${id}-title`}>{current.title}</h2>
          <p>{current.text}</p>
          <div className="guide-controls">
            <span>
              Bước {Math.min(step + 1, steps.length)}/{steps.length}
            </span>
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)}>
                Trước
              </button>
            )}
            <button
              type="button"
              className="ui-button ui-button--primary"
              onClick={() => {
                if (step + 1 < steps.length) setStep(step + 1);
                else {
                  close();
                  setStep(0);
                }
              }}
            >
              {step + 1 < steps.length ? 'Tiếp theo' : 'Mình hiểu rồi'}
            </button>
          </div>
        </section>
      )}
      <button
        ref={trigger}
        className="guide-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={open ? 'Đóng hướng dẫn' : 'Mở hướng dẫn sử dụng'}
        onClick={() => setOpen(!open)}
      >
        <span>{open ? 'Đóng hướng dẫn' : 'Cần mình giúp?'}</span>
        <Mascot compact />
      </button>
    </aside>
  );
}
