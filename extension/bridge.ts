if (location.origin === 'http://localhost:5173') {
  const marker = 'englishvocab-bridge-v1';

  window.addEventListener('message', (event) => {
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      !event.data ||
      event.data.marker !== marker
    ) {
      return;
    }

    const { requestId, type } = event.data;

    if (
      typeof requestId !== 'string' ||
      requestId.length > 128
    ) {
      return;
    }

    let message: Record<string, unknown>;

    switch (type) {
      case 'queue-transfer':
        message = { type };
        break;

      case 'queue-ack':
        message = {
          type,
          transferId: event.data.transferId,
          captureIds: event.data.captureIds,
        };
        break;

      case 'snapshot-update':
        message = {
          type,
          snapshot: event.data.snapshot,
        };
        break;

      case 'personal-delete':
        message = {
          type,
          entryId: event.data.entryId,
          headword: event.data.headword,
        };
        break;

      default:
        return;
    }

    void chrome.runtime
      .sendMessage(message)
      .then((result) => {
        window.postMessage(
          {
            marker: `${marker}-response`,
            requestId,
            result,
          },
          location.origin,
        );
      })
      .catch(() => {
        window.postMessage(
          {
            marker: `${marker}-response`,
            requestId,
            result: {
              ok: false,
              error: 'Extension unavailable',
            },
          },
          location.origin,
        );
      });
  });
}