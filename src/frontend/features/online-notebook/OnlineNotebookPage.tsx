import Mascot from '../../components/mascot/Mascot';
import { initialFilters } from './notebook.types';
import { lazy, useCallback } from 'react';
import Button from '../../components/ui/Button';
import ExpandablePanel from '../../components/ui/ExpandablePanel';
import StatusMessage from '../../components/ui/StatusMessage';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { useLearning } from '../learning/LearningContext';
import { settingsApi } from '../settings/settings.api';
import NotebookFilters from './NotebookFilters';
import NotebookStack from './NotebookStack';
import { useOnlineNotebook } from './useOnlineNotebook';

const SettingsPanel = lazy(() => import('../settings/SettingsPanel'));
const OnlineIpaChart = lazy(() => import('../settings/OnlineIpaChart'));
const ExtensionSyncPanel = lazy(() => import('../sync/ExtensionSyncPanel'));
const OnlineReadingPanel = lazy(
  () => import('../online-reading/OnlineReadingPanel'),
);
const PersonalEntryEditor = lazy(() => import('./PersonalEntryEditor'));
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
  const data = model.resource.data;
  const rows = data?.rows ?? [];
  const filtered = rows;
  const scopeCount = data?.scopeCount ?? 0;
  const allCount = data?.allCount ?? 0;
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
        <Button
          className="notebook-add-button"
          icon="plus"
          disabled={model.busy}
          onClick={() => model.setEditor('new')}
        >
          Thêm từ
        </Button>
      </div>
      <NotebookFilters value={model.filters} onChange={model.setFilters} />
      <div className="cloud-toolbar">
        <p>{data?.total ?? 0} từ phù hợp</p>
        <Button
          variant="secondary"
          className="notebook-refresh-button"
          icon="refresh"
          loading={model.resource.refreshing}
          disabled={model.busy || model.resource.loading}
          onClick={model.refresh}
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
      {hasData && data?.total === 0 && model.editor !== 'new' && (
        <div className="context-empty notebook-empty">
          <Mascot mood="thinking" />
          <div>
            <h2>
              {scopeCount > 0
                ? 'Chưa tìm thấy từ phù hợp'
                : model.filters.scope === 'personal'
                  ? 'Lưu những từ bạn gặp mỗi ngày'
                  : allCount > 0
                    ? 'Chưa có từ đã học'
                    : 'Sổ tay đang chờ những từ đầu tiên!'}
            </h2>
            <p>
              {scopeCount > 0
                ? 'Thử đổi từ khóa hoặc xóa bộ lọc để xem lại các từ của bạn.'
                : model.filters.scope === 'personal'
                  ? 'Chọn Thêm từ hoặc bôi đen từ khi đọc bằng extension để lưu vào đây.'
                  : allCount > 0
                    ? 'Bạn đã có từ trong Từ của tôi. Mở từ sẵn sàng rồi chọn Học từ, hoặc khám phá thêm chủ đề mới.'
                    : 'Học từ mới và viết lại từ để xây dựng sổ tay. Bạn cũng có thể tự thêm từ.'}
            </p>
            {scopeCount === 0 &&
              allCount > 0 &&
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
            {scopeCount > 0 ? (
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
            total={
              enabled ? (data?.enabledCount ?? 0) : (data?.disabledCount ?? 0)
            }
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
      {data && data.total > data.pageSize && (
        <nav className="cloud-actions" aria-label="Phân trang sổ tay">
          <Button
            variant="secondary"
            disabled={model.busy || model.page <= 1}
            onClick={() => model.setPage(model.page - 1)}
          >
            Trang trước
          </Button>
          <span aria-live="polite">
            Trang {model.page} / {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button
            variant="secondary"
            disabled={model.busy || model.page * data.pageSize >= data.total}
            onClick={() => model.setPage(model.page + 1)}
          >
            Trang sau
          </Button>
        </nav>
      )}
      <ExpandablePanel title="Đọc và lưu từ">
        {preferences.data && (
          <OnlineReadingPanel
            contentVersion={model.contentVersion}
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
