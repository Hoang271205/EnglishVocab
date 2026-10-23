import { useEffect } from 'react';
import { bindExtension } from '../../../../../../src/frontend/features/sync/extensionBridge';
export default function ExtensionAccountBoundary({
  ownerId,
}: {
  ownerId: string;
}) {
  useEffect(() => {
    const controller = new AbortController();
    // Extension is optional; explicit sync actions show connection errors.
    void bindExtension(ownerId, controller.signal).catch(() => {});
    return () => controller.abort();
  }, [ownerId]);
  return null;
}
