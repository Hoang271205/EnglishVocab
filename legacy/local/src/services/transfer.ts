import { PersonalService } from './personal';
import { ServiceError } from '../../../../src/domain/types';

export interface ExtensionBridge {
  request(message: Record<string, unknown>): Promise<unknown>;
}

export class TransferService {
  constructor(
    private readonly personal: PersonalService,
    private readonly bridge: ExtensionBridge,
  ) {}

  async receive() {
    const raw = await this.bridge.request({
      type: 'queue-transfer',
    });

    if (
      !raw ||
      typeof raw !== 'object' ||
      !('ok' in raw) ||
      raw.ok !== true ||
      !('value' in raw)
    ) {
      throw new ServiceError(
        'unavailable',
        'Không đọc được hàng đợi extension.',
      );
    }

    // Chỉ gửi xác nhận sau khi dữ liệu đã được lưu vào web.
    const acknowledgment = await this.personal.receive(raw.value);
    const transferred = acknowledgment.captureIds.length;

    try {
      const response = await this.bridge.request({
        type: 'queue-ack',
        transferId: acknowledgment.transferId,
        captureIds: acknowledgment.captureIds,
      });

      const confirmed =
        response !== null &&
        typeof response === 'object' &&
        'ok' in response &&
        response.ok === true;

      return {
        transferred,
        ackPending: !confirmed,
      };
    } catch {
      // Web đã lưu thành công. Có thể nhận lại để hoàn tất xác nhận;
      // ID capture giúp tránh tạo bản trùng.
      return {
        transferred,
        ackPending: true,
      };
    }
  }
}

export class BrowserExtensionBridge implements ExtensionBridge {
  request(message: Record<string, unknown>): Promise<unknown> {
    if (
      typeof window === 'undefined' ||
      window.location.origin !== 'http://localhost:5173'
    ) {
      return Promise.reject(
        new ServiceError(
          'unavailable',
          'Open http://localhost:5173 to transfer captures',
        ),
      );
    }

    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const marker = 'englishvocab-bridge-v1';

      const receive = (event: MessageEvent) => {
        if (
          event.source !== window ||
          event.origin !== window.location.origin ||
          event.data?.marker !== `${marker}-response` ||
          event.data.requestId !== requestId
        ) {
          return;
        }

        clearTimeout(timer);
        window.removeEventListener('message', receive);
        resolve(event.data.result);
      };

      const timer = setTimeout(() => {
        window.removeEventListener('message', receive);
        reject(new ServiceError('unavailable', 'Extension bridge timed out'));
      }, 8000);

      window.addEventListener('message', receive);
      window.postMessage(
        { marker, requestId, ...message },
        window.location.origin,
      );
    });
  }
}