import StudyTools from '../reference/StudyTools';
import BackupPanel from '../data/BackupPanel';
import ContentImportPanel from '../data/ContentImportPanel';
import QueueImportPanel from '../data/QueueImportPanel';
import AppSettingsPanel from '../data/AppSettingsPanel';
import type { useNotebookPage } from './useNotebookPage';

export default function NotebookTools({
  model,
}: {
  model: ReturnType<typeof useNotebookPage>;
}) {
  const {
    referenceVersion,
    deletingId,
    creating,
    readingOpen,
    selectedId,
    setSelectedId,
    setSearch,
    setCollection,
    setCefr,
    setLevel,
    setDueOnly,
    setStatus,
    setReloadKey,
    setReferenceVersion,
    setScope,
  } = model;
  return (
    <>
      <StudyTools key={referenceVersion} />

      <BackupPanel
        disabled={
          deletingId !== null || creating || readingOpen || selectedId !== null
        }
        onRestored={() => {
          setSelectedId(null);
          setSearch('');
          setCollection('all');
          setCefr('');
          setLevel('');
          setDueOnly(false);
          setStatus('all');
          setReloadKey((value) => value + 1);
          setReferenceVersion((value) => value + 1);
        }}
      />
      <ContentImportPanel
        disabled={
          deletingId !== null || creating || readingOpen || selectedId !== null
        }
        onImported={() => {
          setSearch('');
          setCollection('all');
          setCefr('');
          setLevel('');
          setDueOnly(false);
          setStatus('all');
          setReloadKey((value) => value + 1);
          setReferenceVersion((value) => value + 1);
        }}
      />
      <QueueImportPanel
        disabled={
          deletingId !== null || creating || readingOpen || selectedId !== null
        }
        onImported={() => {
          setScope('personal');
          setCollection('all');
          setStatus('all');
          setSearch('');
          setCefr('');
          setLevel('');
          setDueOnly(false);
          setReloadKey((value) => value + 1);
        }}
      />
      <AppSettingsPanel
        key={`settings-${referenceVersion}`}
        disabled={
          deletingId !== null || creating || readingOpen || selectedId !== null
        }
      />
    </>
  );
}
