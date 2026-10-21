import { useEffect, useState } from 'react';
import { backend } from '../../backend';

type IpaCatalog = Awaited<ReturnType<typeof backend.ipa.list>>;

const groups = [
  { id: 'consonant', label: 'Phụ âm' },
  { id: 'vowel', label: 'Nguyên âm đơn' },
  { id: 'diphthong', label: 'Nguyên âm đôi' },
] as const;

export default function IpaChart() {
  const [catalog, setCatalog] = useState<IpaCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setCatalog(null);
    setError(null);

    backend.ipa.list().then(
      (result) => {
        if (!cancelled) setCatalog(result);
      },
      (cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Không tải được bảng IPA.',
          );
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <section className="ipa-chart" aria-labelledby="ipa-chart-title">
      <h3 id="ipa-chart-title">Bảng tra IPA · Anh-Mỹ</h3>

      {!catalog && !error && (
        <p role="status">Đang tải bảng IPA…</p>
      )}

      {error && (
        <div className="load-error" role="alert">
          <p>{error}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {catalog && (
        <>
          {groups.map((group) => (
            <section key={group.id}>
              <h4>{group.label}</h4>

              <dl className="ipa-grid">
                {catalog.phonemes
                  .filter((phoneme) => phoneme.group === group.id)
                  .map((phoneme) => (
                    <div className="ipa-item" key={phoneme.symbol}>
                      <dt>/{phoneme.symbol}/</dt>
                      <dd>{phoneme.example}</dd>

                      {phoneme.aliases.length > 0 && (
                        <dd className="draft-status">
                          Ký hiệu khác:{' '}
                          {phoneme.aliases
                            .map((symbol) => `/${symbol}/`)
                            .join(', ')}
                        </dd>
                      )}
                    </div>
                  ))}
              </dl>
            </section>
          ))}

          <details className="detail-section">
            <summary>Ghi chú và nguồn bảng IPA</summary>

            {catalog.notes.map((note, index) => (
              <p key={index}>{note}</p>
            ))}

            <p>{catalog.source.attribution}</p>
            <p>Giấy phép: {catalog.source.license}</p>

            <a
              href={catalog.source.landingUrl}
              target="_blank"
              rel="noreferrer"
            >
              Xem nguồn
            </a>
          </details>
        </>
      )}
    </section>
  );
}