import { BrowserExtensionBridge } from '../../../services/transfer';
import { backend, initializeBackend } from '../../backend';

const bridge = new BrowserExtensionBridge();

export async function receiveExtensionCaptures() {
  await initializeBackend();

  return backend.transfer.receive();
}

export async function sendLibraryToExtension() {
  await initializeBackend();

  const snapshot = await backend.snapshot.export();

  const response = await bridge.request({
    type: 'snapshot-update',
    snapshot,
  });

  if (
    !response ||
    typeof response !== 'object' ||
    !('ok' in response) ||
    response.ok !== true ||
    !('value' in response) ||
    !response.value ||
    typeof response.value !== 'object' ||
    !('updated' in response.value) ||
    response.value.updated !== true
  ) {
    throw new Error('Extension chưa xác nhận nhận thư viện.');
  }

  return {
    entries: snapshot.entries.length,
  };
}
