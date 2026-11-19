import { useRef, useState } from 'react';
import type { ExtensionUser } from '../accountApi';
import { APP_ORIGIN } from '../config';
import DictionaryForm from '../DictionaryForm';
import MascotImage from '../MascotImage';
import type { LookupSelection } from '../useCaptureLookup';

type Props = {
  user: ExtensionUser;
  busy: boolean;
  error: string | null;
  onLogout: () => Promise<void>;
};

export default function QuickLookup({ user, busy, error, onLogout }: Props) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<{
    id: number;
    selection: LookupSelection;
  } | null>(null);
  const sequence = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  function lookUp(text: string) {
    const word = text.trim().replace(/\s+/gu, ' ');
    if (!word || word.length > 120) return;
    setQuery(word);
    setSearch({
      id: ++sequence.current,
      selection: { word, sourceUrl: APP_ORIGIN },
    });
  }

  return (
    <main className="quick-lookup">
      <header className="lookup-toolbar">
        <strong className="extension-brand">
          <MascotImage /> EnglishVocab
        </strong>
        <details className="lookup-account">
          <summary aria-label="Tài khoản extension" title="Tài khoản extension">
            {Array.from(user.name.trim() || user.email)[0]?.toUpperCase()}
          </summary>
          <div className="lookup-account-menu">
            <strong>{user.name}</strong>
            <p>{user.email}</p>
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => void onLogout()}
            >
              {busy ? 'Đang xử lý…' : 'Đăng xuất'}
            </button>
          </div>
        </details>
      </header>

      <div className="lookup-main">
        <div className="lookup-heading">
          <h1>Tra từ nhanh</h1>
          <span>EN → VI</span>
        </div>
        <form
          className="lookup-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            lookUp(query);
          }}
        >
          <input
            ref={input}
            autoFocus
            aria-label="Từ hoặc cụm từ tiếng Anh"
            placeholder="Nhập từ hoặc cụm từ…"
            value={query}
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="submit"
            aria-label="Tra từ"
            title="Tra từ"
            disabled={!query.trim()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </button>
        </form>

        {error && (
          <p className="message" role="alert">
            {error}
          </p>
        )}

        {search ? (
          <section
            className="lookup-result"
            aria-labelledby="lookup-result-heading"
          >
            <h2 id="lookup-result-heading">{search.selection.word}</h2>
            <DictionaryForm
              key={search.id}
              compact
              selection={search.selection}
              onClose={() => {
                setSearch(null);
                setQuery('');
                input.current?.focus();
              }}
            />
          </section>
        ) : (
          <section className="lookup-welcome" aria-label="Gợi ý tra từ">
            <MascotImage />
            <div>
              <strong>Bạn muốn tra từ nào?</strong>
              <p>Gõ từ rồi nhấn Enter, hoặc thử một từ bên dưới.</p>
              <div className="lookup-suggestions">
                {['curious', 'evidence'].map((word) => (
                  <button key={word} type="button" onClick={() => lookUp(word)}>
                    {word}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="lookup-toolbar-footer">
        <a href={APP_ORIGIN} target="_blank" rel="noreferrer">
          Mở EnglishVocab ↗
        </a>
      </footer>
    </main>
  );
}
