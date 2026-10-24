import { useCallback } from 'react';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import Button from '../../components/ui/Button';
import LoadingSkeleton from '../../components/ui/LoadingSkeleton';
import StatusMessage from '../../components/ui/StatusMessage';
import { notebookApi } from './notebook.api';
import EntryDetails from './EntryDetails';
import type { NotebookRow } from './notebook.types';

export default function NotebookEntry({
  id,
  voiceURI,
  onEdit,
  onClose,
}: {
  id: string;
  voiceURI: string | null;
  onEdit: (row: NotebookRow) => void;
  onClose: () => void;
}) {
  const load = useCallback(
    (signal: AbortSignal) => notebookApi.detail(id, signal),
    [id],
  );
  const resource = useAsyncResource(load, {
    cacheKey: `notebook:entry:${id}`,
    keepStaleData: false,
  });
  if (resource.loading)
    return <LoadingSkeleton variant="detail" label="Đang tải chi tiết từ" />;
  if (resource.error)
    return (
      <>
        <StatusMessage tone="error">{resource.error}</StatusMessage>
        <Button onClick={resource.reload}>Thử lại</Button>
      </>
    );
  return resource.data ? (
    <EntryDetails
      row={resource.data}
      voiceURI={voiceURI}
      onClose={onClose}
      onEdit={() => onEdit(resource.data!)}
    />
  ) : null;
}
