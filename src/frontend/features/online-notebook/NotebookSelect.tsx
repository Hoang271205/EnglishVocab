import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Icon from '../../components/ui/Icon';

interface Option {
  value: string;
  label: string;
}
interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}
const normalise = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('vi');

export default function NotebookSelect({
  label,
  value,
  options,
  onChange,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selected);
  function show() {
    const rect = trigger.current?.getBoundingClientRect();
    setAbove(
      Boolean(
        rect &&
        window.innerHeight - rect.bottom < 260 &&
        rect.top > window.innerHeight - rect.bottom,
      ),
    );
    setActive(selected);
    search.current = { text: '', time: 0 };
    setOpen(true);
  }
  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    if (value !== option.value) onChange(option.value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    const resize = () => setOpen(false);
    document.addEventListener('pointerdown', close);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('resize', resize);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab' || event.key === 'Escape') {
      setOpen(false);
      if (event.key === 'Escape' && open) event.preventDefault();
      return;
    }
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (open) choose(active);
      else show();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) show();
      setActive((index) =>
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : Math.max(
                0,
                Math.min(
                  options.length - 1,
                  (open ? index : selected) +
                    (event.key === 'ArrowDown' ? 1 : -1),
                ),
              ),
      );
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      if (!open) show();
      search.current = {
        text:
          Date.now() - search.current.time < 600
            ? search.current.text + event.key
            : event.key,
        time: Date.now(),
      };
      const next = options.findIndex((option) =>
        normalise(option.label).startsWith(normalise(search.current.text)),
      );
      if (next >= 0) setActive(next);
    }
  }
  return (
    <div className="notebook-select" ref={root}>
      <span className="notebook-control-label" id={`${id}-label`}>
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${id}-list` : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        className={`notebook-select-trigger${open ? ' is-open' : ''}${value ? ' has-value' : ''}`}
        onKeyDown={keyboard}
        onClick={() => {
          if (open) setOpen(false);
          else show();
        }}
      >
        <span id={`${id}-value`}>{options[selected]?.label ?? 'Tất cả'}</span>
        <Icon name="chevron-down" />
      </button>
      {open && (
        <div
          className={`notebook-select-menu${above ? ' is-above' : ''}`}
          role="listbox"
          id={`${id}-list`}
          aria-labelledby={`${id}-label`}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={value === option.value}
              className={`notebook-select-option${active === index ? ' is-active' : ''}${value === option.value ? ' is-selected' : ''}`}
              onPointerMove={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {value === option.value && <Icon name="check" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
