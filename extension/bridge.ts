import { trustedAppOrigins } from './config';
if (trustedAppOrigins.has(location.origin)) {
  const marker = 'englishvocab-bridge-v1';
  const commands = new Set([
    'account-bind',
    'extension-state',
    'connection-install',
    'account-release',
    'queue-transfer',
    'queue-ack',
    'snapshot-update',
    'personal-delete',
  ]);
  window.addEventListener('message', (event) => {
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      !event.data ||
      event.data.marker !== marker
    )
      return;
    const { requestId, type } = event.data;
    if (
      typeof requestId !== 'string' ||
      requestId.length > 128 ||
      !commands.has(type)
    )
      return;
    let message: Record<string, unknown>;
    switch (type) {
      case 'extension-state':
        message = { type };
        break;
      case 'connection-install':
        message = { type, connection: event.data.connection };
        break;
      case 'account-bind':
        message = {
          type,
          ownerId: event.data.ownerId,
          adoptGuest: event.data.adoptGuest === true,
        };
        break;
      case 'account-release':
        message = { type, ownerId: event.data.ownerId };
        break;
      case 'queue-transfer':
        message = {
          type,
          ...(event.data.ownerId ? { ownerId: event.data.ownerId } : {}),
        };
        break;
      case 'queue-ack':
        message = {
          type,
          transferId: event.data.transferId,
          captureIds: event.data.captureIds,
          ...(event.data.ownerId ? { ownerId: event.data.ownerId } : {}),
        };
        break;
      case 'snapshot-update':
        message = {
          type,
          snapshot: event.data.snapshot,
          ...(event.data.ownerId ? { ownerId: event.data.ownerId } : {}),
        };
        break;
      default:
        message = {
          type,
          entryId: event.data.entryId,
          headword: event.data.headword,
          sourceIds: event.data.sourceIds ?? [],
          ...(event.data.ownerId ? { ownerId: event.data.ownerId } : {}),
        };
    }
    const send = (result: unknown) =>
      window.postMessage(
        { marker: `${marker}-response`, requestId, result },
        location.origin,
      );
    void chrome.runtime
      .sendMessage(message)
      .then(send)
      .catch(() =>
        send({
          ok: false,
          error:
            'Extension chưa sẵn sàng. Hãy reload extension và tải lại trang web.',
        }),
      );
  });
}
