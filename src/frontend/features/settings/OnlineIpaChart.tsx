import { useCallback } from 'react';
import { ipaChartSchema } from '../../../content/ipa';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import StatusMessage from '../../components/ui/StatusMessage';
import Button from '../../components/ui/Button';
const groups = [
  ['consonant', 'Phụ âm'],
  ['vowel', 'Nguyên âm đơn'],
  ['diphthong', 'Nguyên âm đôi'],
] as const;
export default function OnlineIpaChart() {
  const load = useCallback(async (signal: AbortSignal) => {
    const response = await fetch('/content/phonemes.json', {
      signal,
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error('Không tải được bảng IPA.');
    return ipaChartSchema.parse(await response.json());
  }, []);
  const resource = useAsyncResource(load, { cacheKey: 'ipa-chart' });
  return (
    <section className="cloud-panel ipa-chart">
      <h2>Bảng IPA · Anh-Mỹ</h2>
      {resource.loading && <StatusMessage>Đang tải bảng IPA…</StatusMessage>}
      {resource.error && (
        <>
          <StatusMessage tone="error">{resource.error}</StatusMessage>
          <Button variant="secondary" onClick={resource.reload}>
            Thử lại
          </Button>
        </>
      )}
      {resource.data && (
        <>
          {groups.map(([id, label]) => (
            <section key={id}>
              <h3>{label}</h3>
              <dl className="ipa-grid">
                {resource
                  .data!.phonemes.filter((sound) => sound.group === id)
                  .map((sound) => (
                    <div className="ipa-item" key={sound.symbol}>
                      <dt>/{sound.symbol}/</dt>
                      <dd>{sound.example}</dd>
                      {sound.aliases.length > 0 && (
                        <dd>{sound.aliases.join(', ')}</dd>
                      )}
                    </div>
                  ))}
              </dl>
            </section>
          ))}
          <details>
            <summary>Ghi chú và nguồn</summary>
            {resource.data.notes.map((note, index) => (
              <p key={index}>{note}</p>
            ))}
            <p>
              {resource.data.source.attribution} ·{' '}
              {resource.data.source.license}
            </p>
            <a
              href={resource.data.source.landingUrl}
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
