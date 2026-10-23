import { isClozeLetter } from '../../../domain/cloze';
import { useRef } from 'react';
import type { ClozeCell } from '../../../domain/types';

type ClozeInputsProps = {
  cells: ClozeCell[];
  values: string[];
  disabled: boolean;
  onChange: (values: string[]) => void;
};

export default function ClozeInputs({
  cells,
  values,
  disabled,
  onChange,
}: ClozeInputsProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function focus(index: number) {
    inputs.current[index]?.focus();
  }

  function changeLetter(index: number, text: string) {
    const letter =
      Array.from(text.normalize('NFKC'))
        .filter((character) => /^\p{L}$/u.test(character))
        .at(-1) ?? '';

    const next = [...values];
    next[index] = letter;
    onChange(next);

    if (letter && index < values.length - 1) {
      focus(index + 1);
    }
  }

  let letterIndex = 0;

  return (
    <span className="cloze-word" role="group" aria-label="Các chữ cần điền">
      {cells.map((cell, cellIndex) => {
        if (cell.kind === 'fixed' && !isClozeLetter(cell)) {
          return (
            <span
              key={cellIndex}
              className={`cloze-fixed${
                /^\s+$/u.test(cell.value) ? ' is-space' : ''
              }`}
            >
              {cell.value}
            </span>
          );
        }

        const index = letterIndex++;

        return (
          <span className="cloze-cell" key={cellIndex}>
            {cell.kind === 'fixed' && !values[index] && (
              <span className="cloze-letter-hint" aria-hidden="true">
                {cell.value}
              </span>
            )}
            <input
              ref={(element) => {
                inputs.current[index] = element;
              }}
              className="cloze-letter"
              type="text"
              value={values[index] ?? ''}
              disabled={disabled}
              maxLength={2}
              autoFocus={index === 0}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label={`Chữ ${index + 1}${cell.kind === 'fixed' ? ' (có gợi ý)' : ''}`}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => changeLetter(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) {
                  return;
                }

                if (event.key === 'ArrowLeft' && index > 0) {
                  event.preventDefault();
                  focus(index - 1);
                }

                if (event.key === 'ArrowRight' && index < values.length - 1) {
                  event.preventDefault();
                  focus(index + 1);
                }

                if (event.key === 'Backspace' && !values[index] && index > 0) {
                  event.preventDefault();

                  const next = [...values];
                  next[index - 1] = '';
                  onChange(next);
                  focus(index - 1);
                }
              }}
              onPaste={(event) => {
                event.preventDefault();

                const characters = Array.from(
                  event.clipboardData.getData('text').normalize('NFKC'),
                ).filter((character) => /^\p{L}$/u.test(character));

                if (!characters.length) {
                  return;
                }

                const next = [...values];

                for (
                  let offset = 0;
                  offset < characters.length && index + offset < next.length;
                  offset++
                ) {
                  next[index + offset] = characters[offset] ?? '';
                }

                onChange(next);

                focus(Math.min(index + characters.length, values.length - 1));
              }}
            />
          </span>
        );
      })}
    </span>
  );
}
