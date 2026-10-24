import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { queryKey } from '../../../dictionary/freeDictionary';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import ReadingLookup from './ReadingLookup';
import type { NotebookRow } from '../online-notebook/notebook.types';
interface Props {
  rows: NotebookRow[];
  onlineEnabled: boolean;
  voiceURI: string | null;
  onSaved: () => void;
}
interface Selection {
  word: string;
  left: number;
  top: number;
}
export default function OnlineReadingPanel({
  rows,
  onlineEnabled,
  voiceURI,
  onSaved,
}: Props) {
  const [text, setText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [opened, setOpened] = useState(false);
  const article = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const clear = () => {
      if (!opened) setSelection(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpened(false);
        setSelection(null);
      }
    };
    window.addEventListener('scroll', clear, true);
    window.addEventListener('resize', clear);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('scroll', clear, true);
      window.removeEventListener('resize', clear);
      window.removeEventListener('keydown', escape);
    };
  }, [opened]);
  function select() {
    const current = window.getSelection();
    if (
      !current ||
      current.isCollapsed ||
      !current.rangeCount ||
      !article.current
    ) {
      if (!opened) setSelection(null);
      return;
    }
    const range = current.getRangeAt(0);
    if (
      !article.current.contains(range.startContainer) ||
      !article.current.contains(range.endContainer)
    )
      return;
    try {
      const word = queryKey(current.toString());
      const rect = range.getBoundingClientRect();
      setSelection({
        word,
        left: Math.max(
          8,
          Math.min(window.innerWidth - 48, rect.left + rect.width / 2 - 18),
        ),
        top: Math.max(8, rect.top - 44),
      });
      setOpened(false);
    } catch {
      setSelection(null);
    }
  }
  return (
    <section className="cloud-panel">
      <h2>Đọc và lưu từ</h2>
      <p>
        Dán bài đọc, bôi đen một từ rồi bấm icon tra cứu. Chỉ lưu từ và URL
        nguồn; không lưu đoạn văn.
      </p>
      <FormField
        label="URL bài đọc (tuỳ chọn)"
        type="url"
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
      />
      <label className="cloud-form">
        Nội dung bài đọc
        <textarea
          value={text}
          maxLength={100000}
          onChange={(event) => {
            setText(event.target.value);
            setSelection(null);
            setOpened(false);
          }}
        />
      </label>
      <div
        ref={article}
        className="cloud-reading-article"
        onMouseUp={select}
        onKeyUp={select}
        tabIndex={0}
        aria-label="Bài đọc để bôi đen từ"
      >
        {text || 'Nội dung bài đọc sẽ hiển thị ở đây.'}
      </div>
      {selection &&
        !opened &&
        createPortal(
          <button
            type="button"
            className="cloud-lookup-icon"
            style={{ left: selection.left, top: selection.top }}
            onMouseDown={(event) => event.preventDefault()}
            aria-label={`Tra từ ${selection.word}`}
            onClick={() => setOpened(true)}
          >
            <img src="/favicon.svg" alt="" width="30" height="30" />
          </button>,
          document.body,
        )}
      {selection &&
        opened &&
        createPortal(
          <div
            className="cloud-popup-backdrop"
            onClick={() => setOpened(false)}
          >
            <div onClick={(event) => event.stopPropagation()}>
              <ReadingLookup
                key={selection.word}
                word={selection.word}
                sourceUrl={sourceUrl}
                rows={rows}
                onlineEnabled={onlineEnabled}
                voiceURI={voiceURI}
                onSaved={onSaved}
                onClose={() => setOpened(false)}
              />
            </div>
          </div>,
          document.body,
        )}
      {text && (
        <Button
          variant="secondary"
          onClick={() => {
            setText('');
            setSelection(null);
            setOpened(false);
          }}
        >
          Xoá bài đọc tạm
        </Button>
      )}
    </section>
  );
}
