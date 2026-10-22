import { useEffect, useRef, useState } from 'react';
import { backend, initializeBackend } from '../../backend';
import type {
  SettingsFormValues,
  AppSettingsPanelProps,
  SettingsOperation,
} from './types';

export function useAppSettingsPanel({ disabled }: AppSettingsPanelProps) {
  const [form, setForm] = useState<SettingsFormValues | null>(null);
  const [dailyTarget, setDailyTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<SettingsOperation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    setLoading(true);
    setError(null);
    async function load() {
      try {
        await initializeBackend();
        const settings = await backend.settings.get();
        if (cancelled) return;
        setForm({
          learnBatchSize: settings.learnBatchSize,
          reviewBatchSize: settings.reviewBatchSize,
          onlineLookupEnabled: settings.onlineLookupEnabled,
        });
        setDailyTarget(String(settings.dailyNewWordTarget));
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : 'Không tải được cài đặt.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [reloadKey]);
  function change(patch: Partial<SettingsFormValues>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
  }
  async function run(
    nextOperation: SettingsOperation,
    action: () => Promise<void>,
  ) {
    if (lock.current || disabled || loading) return;
    lock.current = true;
    setOperation(nextOperation);
    setError(null);
    setNotice(null);
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
      if (mounted.current) setOperation(null);
    }
  }
  async function save() {
    if (!form) return;
    await run('save', async () => {
      const target = Number(dailyTarget);
      if (!Number.isInteger(target) || target < 1 || target > 1000) {
        throw new Error('Mục tiêu phải là số nguyên từ 1 đến 1.000.');
      }
      const saved = await backend.settings.update({
        learnBatchSize: form.learnBatchSize,
        reviewBatchSize: form.reviewBatchSize,
        dailyNewWordTarget: target,
        onlineLookupEnabled: form.onlineLookupEnabled,
      });
      if (!mounted.current) return;
      setForm({
        learnBatchSize: saved.learnBatchSize,
        reviewBatchSize: saved.reviewBatchSize,
        onlineLookupEnabled: saved.onlineLookupEnabled,
      });
      setDailyTarget(String(saved.dailyNewWordTarget));
      setNotice('Đã lưu cài đặt.');
    });
  }
  async function clearCache() {
    await run('clear-cache', async () => {
      await backend.dictionary.clearCache();
      if (mounted.current) {
        setNotice(
          'Đã xóa cache tra cứu của web. ' +
            'Từ đã lưu và tiến độ vẫn được giữ nguyên.',
        );
      }
    });
  }
  const blocked = disabled || loading || operation !== null;
  return {
    loading,
    form,
    save,
    blocked,
    change,
    dailyTarget,
    setDailyTarget,
    operation,
    clearCache,
    notice,
    error,
    setReloadKey,
  };
}
