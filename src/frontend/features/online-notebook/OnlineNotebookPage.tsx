import { useCallback } from 'react';
import Button from '../../components/ui/Button';
import ExpandablePanel from '../../components/ui/ExpandablePanel';
import StatusMessage from '../../components/ui/StatusMessage';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useLearning } from '../learning/LearningContext';
import { settingsApi } from '../settings/settings.api';
import SettingsPanel from '../settings/SettingsPanel';
import OnlineIpaChart from '../settings/OnlineIpaChart';
import ExtensionSyncPanel from '../sync/ExtensionSyncPanel';
import OnlineReadingPanel from '../online-reading/OnlineReadingPanel';
import PersonalEntryEditor from './PersonalEntryEditor';
import NotebookFilters from './NotebookFilters';
import NotebookStack from './NotebookStack';
import { filterRows } from './filterRows';
import { useOnlineNotebook } from './useOnlineNotebook';
interface Props {
  ownerId: string;
  canLearn: boolean;
  onChanged: () => void;
}
export default function OnlineNotebookPage({
  ownerId,
  canLearn,
  onChanged,
}: Props) {
  const model = useOnlineNotebook(ownerId, onChanged);
  const learning = useLearning();
  const loadSettings = useCallback(
    (signal: AbortSignal) => settingsApi.get(signal),
    [],
  );
  const preferences = useAsyncResource(loadSettings);
  const rows = model.resource.data ?? [];
  const filtered = filterRows(rows, model.filters, Date.now());
  function settingsChanged() {
    preferences.reload();
    onChanged();
  }
  return (
    <section className="cloud-notebook">
      <p className="eyebrow">SỔ TAY CỦA BẠN</p>
      <div className="cloud-toolbar">
        <h1>Sổ tay</h1>
        <Button disabled={model.busy} onClick={() => model.setEditor('new')}>
          Thêm từ
        </Button>
      </div>
      <NotebookFilters value={model.filters} onChange={model.setFilters} />
      <div className="cloud-toolbar">
        <p>{filtered.length} từ phù hợp</p>
        <Button
          variant="secondary"
          disabled={model.busy || model.resource.loading}
          onClick={model.resource.reload}
        >
          Làm mới
        </Button>
      </div>
      {model.notice && <StatusMessage>{model.notice}</StatusMessage>}
      {model.error && <StatusMessage tone="error">{model.error}</StatusMessage>}
      {model.resource.error && (
        <StatusMessage tone="error">{model.resource.error}</StatusMessage>
      )}
      {model.resource.loading && (
        <StatusMessage>Đang tải sổ tay…</StatusMessage>
      )}
      {model.cleanup.length > 0 && (
        <Button
          variant="secondary"
          loading={model.busy}
          onClick={() => void model.retryCleanup()}
        >
          Dọn cache còn lại ({model.cleanup.length})
        </Button>
      )}
      {model.editor && (
        <PersonalEntryEditor
          key={model.editor === 'new' ? 'new' : model.editor.entry.id}
          {...(model.editor === 'new'
            ? {}
            : {
                entry: model.editor.entry,
                learned: Boolean(model.editor.progress),
              })}
          busy={model.busy}
          onSave={model.save}
          onCancel={() => model.setEditor(null)}
        />
      )}
      {!model.resource.loading &&
        !model.resource.error &&
        [true, false].map((enabled) => (
          <NotebookStack
            key={String(enabled)}
            title={enabled ? 'Bật ôn tập' : 'Không ôn tập'}
            rows={filtered.filter((row) => row.reviewEnabled === enabled)}
            selectedId={model.selectedId}
            busy={model.busy}
            voiceURI={learning.voiceURI}
            onSelect={model.setSelectedId}
            onEdit={model.setEditor}
            onDelete={(row) => void model.remove(row)}
            onReview={(row, value) => void model.toggle(row, value)}
            canLearn={
              canLearn &&
              !learning.pending &&
              !learning.loading &&
              !learning.error
            }
            onLearn={(row) => void learning.startPersonal([row.entry.id])}
          />
        ))}
      <ExpandablePanel title="Đọc và lưu từ">
        {preferences.data && (
          <OnlineReadingPanel
            rows={rows}
            onlineEnabled={preferences.data.settings.onlineLookupEnabled}
            voiceURI={learning.voiceURI}
            onSaved={model.changed}
          />
        )}
      </ExpandablePanel>
      <ExpandablePanel title="Extension và dữ liệu">
        <ExtensionSyncPanel ownerId={ownerId} onImported={model.changed} />
      </ExpandablePanel>
      <ExpandablePanel title="Cài đặt và giọng đọc">
        <SettingsPanel onSaved={settingsChanged} />
      </ExpandablePanel>
      <ExpandablePanel title="Bảng tra IPA">
        <OnlineIpaChart />
      </ExpandablePanel>
      {preferences.error && (
        <>
          <StatusMessage tone="error">{preferences.error}</StatusMessage>
          <Button variant="secondary" onClick={preferences.reload}>
            Tải lại cài đặt Reading
          </Button>
        </>
      )}
    </section>
  );
}
