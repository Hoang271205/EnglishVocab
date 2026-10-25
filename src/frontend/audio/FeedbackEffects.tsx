import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { FEEDBACK_EVENT, readExperience } from './experience';
import type { FeedbackKind } from './experience';

export default function FeedbackEffects() {
  const [burst, setBurst] = useState<{
    id: number;
    kind: FeedbackKind;
    animate: boolean;
  } | null>(null);
  const serial = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const feedback = (event: Event) => {
      if (
        !(event instanceof CustomEvent) ||
        !['correct', 'retry', 'complete'].includes(event.detail?.kind)
      )
        return;
      const kind = event.detail.kind as FeedbackKind;
      const animate =
        !readExperience().reduceMotion &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      clearTimeout(timer);
      setBurst({ id: ++serial.current, kind, animate });
      document.documentElement.dataset.studyFeedback = kind;
      timer = setTimeout(() => {
        setBurst(null);
        delete document.documentElement.dataset.studyFeedback;
      }, 1600);
    };
    window.addEventListener(FEEDBACK_EVENT, feedback);
    return () => {
      window.removeEventListener(FEEDBACK_EVENT, feedback);
      clearTimeout(timer);
      delete document.documentElement.dataset.studyFeedback;
    };
  }, []);
  if (!burst) return null;
  return (
    <>
      <span className="experience-sr" role="status">
        {burst.kind === 'retry'
          ? 'Chưa đúng, mình thử lại nhé.'
          : burst.kind === 'complete'
            ? 'Đã hoàn thành, bạn làm tốt lắm!'
            : 'Đúng rồi, bạn làm tốt lắm!'}
      </span>
      {burst.animate && burst.kind !== 'retry' && (
        <div
          key={burst.id}
          className={`learning-confetti${burst.kind === 'complete' ? ' learning-confetti--complete' : ''}`}
          aria-hidden="true"
        >
          {Array.from(
            { length: burst.kind === 'complete' ? 24 : 12 },
            (_, index) => (
              <i
                key={index}
                style={
                  {
                    '--petal-x': `${Math.cos(index * 2.4) * (90 + index * 7)}px`,
                    '--petal-y': `${-70 - (index % 5) * 36}px`,
                    '--petal-turn': `${index * 43}deg`,
                    '--petal-delay': `${(index % 4) * 35}ms`,
                    '--petal-color': [
                      '#8ab66a',
                      '#f1cc64',
                      '#c2d89f',
                      '#e9b396',
                    ][index % 4],
                  } as CSSProperties
                }
              />
            ),
          )}
        </div>
      )}
    </>
  );
}
