import { useEffect, useRef, useState } from 'react';
import { downloadBackup, readBackup, restoreBackup } from './backupFiles';
import type { Backup } from './backupFiles';
import type { BackupPanelProps, BackupOperation } from './types';
import {
  LAST_CHECKED_KEY,
  SEVEN_DAYS,
  readLastChecked,
} from './backupReminder';

export function useBackupPanel({ disabled, onRestored }: BackupPanelProps) {
  const [operation, setOperation] = useState<BackupOperation | null>(null);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [fileName, setFileName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState(readLastChecked);
  const [pendingExport, setPendingExport] = useState<number | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(
    nextOperation: BackupOperation,
    action: () => Promise<void>,
  ) {
    if (lock.current || disabled) return;
    lock.current = true;
    setOperation(nextOperation);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch (cause: unknown) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Không thực hiện được thao tác.',
        );
      }
    } finally {
      lock.current = false;
      if (mounted.current) {
        setOperation(null);
      }
    }
  }
  async function exportFile() {
    await run('export', async () => {
      const exportedAt = await downloadBackup();
      if (!mounted.current) return;
      setPendingExport(exportedAt);
      setNotice(
        'Đã gửi yêu cầu tải file tới trình duyệt. ' +
          'Hãy kiểm tra tệp trong thư mục tải xuống.',
      );
    });
  }
  function confirmDownloadedFile() {
    if (pendingExport === null) return;
    try {
      localStorage.setItem(LAST_CHECKED_KEY, String(pendingExport));
      setLastChecked(pendingExport);
      setPendingExport(null);
      setError(null);
      setNotice('Đã ghi nhận bạn kiểm tra tệp sao lưu.');
    } catch {
      setError(
        'Không lưu được mốc nhắc sao lưu trên trình duyệt. ' +
          'Tệp bạn đã tải không bị ảnh hưởng.',
      );
    }
  }
  async function inspectFile(file: File) {
    await run('inspect', async () => {
      setPreview(null);
      setConfirmed(false);
      setFileName('');
      const backup = await readBackup(file);
      if (!mounted.current) return;
      setPreview(backup);
      setFileName(file.name);
    });
  }
  async function restoreFile() {
    if (!preview || !confirmed) return;
    await run('restore', async () => {
      const result = await restoreBackup(preview);
      if (!mounted.current) return;
      setPreview(null);
      setConfirmed(false);
      setFileName('');
      setNotice(
        `Đã khôi phục ${result.entries} mục từ và ` +
          `${result.progress} tiến độ học.`,
      );
      onRestored();
    });
  }
  const busy = operation !== null;
  const blocked = disabled || busy;
  const backupDue = lastChecked === 0 || Date.now() - lastChecked >= SEVEN_DAYS;
  return {
    backupDue,
    lastChecked,
    blocked,
    exportFile,
    operation,
    pendingExport,
    confirmDownloadedFile,
    inspectFile,
    preview,
    fileName,
    confirmed,
    setConfirmed,
    restoreFile,
    setPreview,
    setFileName,
    notice,
    error,
  };
}
