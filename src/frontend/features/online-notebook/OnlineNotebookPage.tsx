import Mascot from '../../components/mascot/Mascot';
import { initialFilters } from './notebook.types';
import { useCallback } from 'react';
import Button from '../../components/ui/Button';
import ExpandablePanel from '../../components/ui/ExpandablePanel';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
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
  onBrowseTopics: () => void;
  ownerId: string;
  canLearn: boolean;
  onChanged: () => void;
}
export default function OnlineNotebookPage({
  onBrowseTopics,
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
  const preferences = useAsyncResource(loadSettings, {
    cacheKey: 'settings',
    keepStaleData: false,
  });
  const rows = model.resource.data ?? [];
  const filtered = filterRows(rows, model.filters, Date.now());
  const scopedRows = filterRows(
    rows,
    { ...initialFilters, scope: model.filters.scope },
    Date.now(),
  );
  const hasData =
    !model.resource.loading &&
    Boolean(model.resource.data) &&
    !model.resource.error;
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
      {model.resource.loading && <LoadingSkeleton label="Đang tải sổ tay" />}
      {model.cleanup.length > 0 && (
        <Button
          variant="secondary"
          loading={model.busy}
          onClick={() => void model.retryCleanup()}
        >
          Dọn cache còn lại ({model.cleanup.length})
        </Button>
      )}
      {model.editor === 'new' && (
        <PersonalEntryEditor
          key="new"
          busy={model.busy}
          onSave={model.save}
          onCancel={() => model.setEditor(null)}
        />
      )}
      {hasData && filtered.length === 0 && model.editor !== 'new' && (
        <div className="context-empty notebook-empty">
          <Mascot mood="thinking" />
          <div>
            <h2>
              {scopedRows.length > 0
                ? 'Chưa tìm thấy từ phù hợp'
                : model.filters.scope === 'personal'
                  ? 'Lưu những từ bạn gặp mỗi ngày'
                  : rows.length > 0
                    ? 'Chưa có từ đã học'
                    : 'Sổ tay đang chờ những từ đầu tiên!'}
            </h2>
            <p>
              {scopedRows.length > 0
                ? 'Thử đổi từ khóa hoặc xóa bộ lọc để xem lại các từ của bạn.'
                : model.filters.scope === 'personal'
                  ? 'Chọn Thêm từ hoặc bôi đen từ khi đọc bằng extension để lưu vào đây.'
                  : rows.length > 0
                    ? 'Bạn đã có từ trong Từ của tôi. Mở từ sẵn sàng rồi chọn Học từ, hoặc khám phá thêm chủ đề mới.'
                    : 'Học từ mới và viết lại từ để xây dựng sổ tay. Bạn cũng có thể tự thêm từ.'}
            </p>
            {scopedRows.length === 0 &&
              rows.length > 0 &&
              model.filters.scope === 'learned' &&
              !learning.pending && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    model.setFilters({ ...initialFilters, scope: 'personal' })
                  }
                >
                  Xem Từ của tôi
                </Button>
              )}
            {scopedRows.length > 0 ? (
              <Button
                variant="secondary"
                onClick={() =>
                  model.setFilters({
                    ...initialFilters,
                    scope: model.filters.scope,
                  })
                }
              >
                Xóa bộ lọc
              </Button>
            ) : learning.pending ? (
              <Button
                disabled={!canLearn || learning.working}
                onClick={() => learning.openPending()}
              >
                Tiếp tục học
              </Button>
            ) : (
              <Button
                icon="learn"
                disabled={!canLearn || learning.working}
                onClick={onBrowseTopics}
              >
                Học từ mới
              </Button>
            )}
          </div>
        </div>
      )}
      {!model.resource.loading &&
        model.resource.data &&
        filtered.length > 0 &&
        [true, false].map((enabled) => (
          <NotebookStack
            key={String(enabled)}
            title={enabled ? 'Bật ôn tập' : 'Không ôn tập'}
            rows={filtered.filter((row) => row.reviewEnabled === enabled)}
            selectedId={model.selectedId}
            busy={model.busy}
            voiceURI={learning.voiceURI}
            onSelect={model.setSelectedId}
            editor={model.editor === 'new' ? null : model.editor}
            onEdit={(row) => {
              model.setSelectedId(row.entry.id);
              model.setEditor(row);
            }}
            onSave={model.save}
            onCancelEdit={() => model.setEditor(null)}
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
