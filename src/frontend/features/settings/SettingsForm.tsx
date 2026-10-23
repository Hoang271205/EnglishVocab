import { useState } from 'react';
import { REVIEW_BATCH_SIZES } from '../../../shared/studyOptions';
import type { ReviewBatchSize } from '../../../shared/studyOptions';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import StatusMessage from '../../components/ui/StatusMessage';
import { useAmericanSpeech } from '../../hooks/useAmericanSpeech';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { settingsApi } from './settings.api';
import type { SettingsDocument } from './settings.api';
interface Props {
  document: SettingsDocument;
  onSaved: () => void;
}
export default function SettingsForm({ document, onSaved }: Props) {
  const [value, setValue] = useState(document.settings);
  const [saved, setSaved] = useState(false);
  const speech = useAmericanSpeech(value.voiceURI);
  const action = useAsyncAction();
  const unavailable = Boolean(
    value.voiceURI &&
    !speech.voices.some((voice) => voice.id === value.voiceURI),
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void (async () => {
          setSaved(false);
          const result = await action.run((signal) =>
            settingsApi.save(document, value, signal),
          );
          if (result) {
            setSaved(true);
            onSaved();
          }
        })();
      }}
    >
      <fieldset className="cloud-form" disabled={action.busy}>
        <label>
          Giọng đọc Anh-Mỹ
          <select
            value={value.voiceURI ?? ''}
            onChange={(e) =>
              setValue({ ...value, voiceURI: e.target.value || null })
            }
          >
            <option value="">Tự chọn giọng en-US trên thiết bị</option>
            {unavailable && (
              <option value={value.voiceURI!}>
                Giọng đã lưu không có trên máy này
              </option>
            )}
            {speech.voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
                {voice.local ? ' · Trên thiết bị' : ''}
              </option>
            ))}
          </select>
        </label>
        {!speech.voices.length && (
          <StatusMessage>
            Chưa tìm thấy giọng Anh-Mỹ trên thiết bị. Danh sách sẽ tự cập nhật
            khi trình duyệt tải giọng.
          </StatusMessage>
        )}
        <Button
          variant="secondary"
          onClick={() =>
            speech.speak(
              'A little practice every day helps me remember new words.',
            )
          }
        >
          Nghe thử giọng Mỹ
        </Button>
        {speech.error && (
          <StatusMessage tone="error">{speech.error}</StatusMessage>
        )}
        <div className="cloud-filter-grid">
          <label>
            Từ mới mỗi lượt
            <select
              value={value.learnBatchSize}
              onChange={(e) =>
                setValue({
                  ...value,
                  learnBatchSize: Number(e.target.value) as 5 | 10,
                })
              }
            >
              <option value={5}>5 từ</option>
              <option value={10}>10 từ</option>
            </select>
          </label>
          <label>
            Ôn tập mỗi lượt
            <select
              value={value.reviewBatchSize}
              onChange={(e) =>
                setValue({
                  ...value,
                  reviewBatchSize: Number(e.target.value) as ReviewBatchSize,
                })
              }
            >
              {REVIEW_BATCH_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} từ
                </option>
              ))}
            </select>
          </label>
        </div>
        <FormField
          label="Mục tiêu từ mới mỗi ngày"
          type="number"
          min={1}
          max={1000}
          required
          value={value.dailyNewWordTarget}
          onChange={(e) =>
            setValue({ ...value, dailyNewWordTarget: Number(e.target.value) })
          }
        />
        <label className="cloud-check">
          <input
            type="checkbox"
            checked={value.onlineLookupEnabled}
            onChange={(e) =>
              setValue({ ...value, onlineLookupEnabled: e.target.checked })
            }
          />
          Cho phép tra từ qua mạng trong Reading
        </label>
        <p>
          Giọng đọc dùng speechSynthesis của trình duyệt. Bảng IPA chỉ hiển thị
          chữ; không tải file audio.
        </p>
        {action.error && (
          <StatusMessage tone="error">
            {action.error.message} Nếu cài đặt đã đổi ở tab khác, đóng và mở lại
            mục này trước khi lưu.
          </StatusMessage>
        )}
        {saved && <StatusMessage>Đã lưu cài đặt cho tài khoản.</StatusMessage>}
        <Button type="submit" loading={action.busy}>
          Lưu cài đặt
        </Button>
      </fieldset>
    </form>
  );
}
