import { useCallback, useState } from 'react';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import Button from '../../components/ui/Button';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import SettingsForm from './SettingsForm';
import { settingsApi } from './settings.api';
export default function SettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [saved, setSaved] = useState(false);
  const load = useCallback(
    (signal: AbortSignal) => settingsApi.get(signal),
    [],
  );
  const resource = useAsyncResource(load, {
    cacheKey: 'settings',
    keepStaleData: false,
  });
  return (
    <section className="cloud-panel">
      <div className="cloud-toolbar">
        <h2>Cài đặt học tập và giọng đọc</h2>
        <Button
          variant="secondary"
          disabled={resource.loading}
          onClick={resource.reload}
        >
          Tải lại
        </Button>
      </div>
      {saved && <StatusMessage>Đã lưu cài đặt cho tài khoản.</StatusMessage>}
      {resource.loading && <LoadingSkeleton variant="form" label="Đang tải cài đặt" />}
      {resource.error && (
        <StatusMessage tone="error">{resource.error}</StatusMessage>
      )}
      {resource.data && (
        <SettingsForm
          key={resource.data.revision}
          document={resource.data}
          onSaved={() => {
            setSaved(true);
            resource.reload();
            onSaved();
          }}
        />
      )}
    </section>
  );
}
