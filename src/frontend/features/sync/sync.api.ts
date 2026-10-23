import { apiRequest } from '../../api/client';
import { authApi } from '../auth/auth.api';
import { bindExtension, extensionRequest } from './extensionBridge';
import type { Entry } from '../../../domain/types';
export interface Transfer {
  protocol: 1;
  type: 'capture-transfer';
  transferId: string;
  captures: unknown[];
}
export interface TransferAck {
  protocol: 1;
  type: 'capture-ack';
  transferId: string;
  captureIds: string[];
  summary: {
    createdEntries: number;
    receivedCaptures: number;
    duplicateCaptures: number;
  };
}
export async function verifyOwner(ownerId: string, signal: AbortSignal) {
  if ((await authApi.currentUser(signal)).id !== ownerId)
    throw new Error('Tài khoản đã thay đổi ở tab khác. Hãy tải lại trang.');
}
export const syncApi = {
  receive: (transfer: unknown, signal: AbortSignal) =>
    apiRequest<TransferAck>('/api/transfers/receive', {
      method: 'POST',
      body: transfer,
      signal,
    }),
  async snapshot(ownerId: string, signal: AbortSignal) {
    await verifyOwner(ownerId, signal);
    await bindExtension(ownerId, signal);
    const result = await apiRequest<{
      ownerId: string;
      snapshot: { protocol: 1; version: number; entries: Entry[] };
      summary: { totalEntries: number };
    }>('/api/transfers/snapshot', { method: 'POST', body: {}, signal });
    if (result.ownerId !== ownerId)
      throw new Error('Tài khoản đồng bộ không khớp. Hãy tải lại trang.');
    await extensionRequest(
      'snapshot-update',
      { ownerId, snapshot: result.snapshot },
      signal,
    );
    return result.summary.totalEntries;
  },
  export: (signal: AbortSignal) =>
    apiRequest<unknown>('/api/notebook/export', { signal }),
};
export function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
