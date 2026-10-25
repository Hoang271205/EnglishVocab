import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Icon from '../components/ui/Icon';
import {
  pauseExperience,
  playClick,
  readExperience,
  subscribeExperience,
  unlockAudio,
  updateExperience,
} from './experience';

export default function ExperienceControls() {
  const prefs = useSyncExternalStore(subscribeExperience, readExperience);
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.documentElement.dataset.motion = readExperience().reduceMotion
      ? 'reduced'
      : 'system';
    // A human gesture unlocks the browser's audio context. Merely opening a page does not.
    const activate = (event: Event) => {
      if (!event.isTrusted) return;
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key))
        return;
      void unlockAudio();
    };
    const click = (event: MouseEvent) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      const control = event.target.closest(
        'button, a[href], input[type="checkbox"]',
      );
      if (
        control &&
        !control.matches(':disabled, [aria-disabled="true"]') &&
        !control.closest('[data-no-click-sound]')
      )
        playClick();
    };
    const visibility = () => {
      if (document.hidden) pauseExperience();
      else if (readExperience().started) void unlockAudio();
    };
    const exit = () => pauseExperience();
    window.addEventListener('pointerdown', activate, { passive: true });
    window.addEventListener('keydown', activate);
    document.addEventListener('click', click);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', exit);
    return () => {
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
      document.removeEventListener('click', click);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', exit);
      pauseExperience();
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div className="experience-dock" ref={container} data-no-click-sound>
      {open && (
        <section
          className="experience-panel"
          id={id}
          aria-labelledby={`${id}-title`}
        >
          <div className="experience-panel-heading">
            <span className="experience-symbol">
              <Icon name="music" />
            </span>
            <div>
              <h2 id={`${id}-title`}>Một góc học thật chill</h2>
              <p>Chọn không gian bạn thấy dễ chịu.</p>
            </div>
          </div>
          <label className="experience-option">
            <span>
              <strong>Âm thanh tương tác</strong>
              <small>Tiếng chạm, trả lời đúng và hoàn thành.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={prefs.effects}
              onChange={async (event) => {
                updateExperience({ effects: event.target.checked });
                if (await unlockAudio()) playClick();
              }}
            />
          </label>
          <label className="experience-option">
            <span>
              <strong>Nhạc nền êm dịu</strong>
              <small>Giai điệu nhẹ, tự dừng khi rời tab.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={prefs.music}
              onChange={(event) => {
                updateExperience({ music: event.target.checked });
                void unlockAudio();
              }}
            />
          </label>
          <label className="experience-volume">
            <span>
              Âm lượng <output>{Math.round(prefs.volume * 100)}%</output>
            </span>
            <input
              aria-label="Âm lượng nhạc và hiệu ứng"
              type="range"
              min="0"
              max="100"
              value={Math.round(prefs.volume * 100)}
              onChange={(event) =>
                updateExperience({ volume: Number(event.target.value) / 100 })
              }
            />
          </label>
          <label className="experience-option">
            <span>
              <strong>Giảm chuyển động</strong>
              <small>Giao diện yên tĩnh hơn để tập trung.</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={prefs.reduceMotion}
              onChange={(event) =>
                updateExperience({ reduceMotion: event.target.checked })
              }
            />
          </label>
          {prefs.error && (
            <p className="experience-note" role="status">
              {prefs.error}{' '}
              <button type="button" onClick={() => void unlockAudio()}>
                Thử bật lại
              </button>
            </p>
          )}
          <p className="experience-note">
            Cài đặt được nhớ trên trình duyệt này. Giọng đọc từ vựng được chọn
            riêng trong sổ tay.
          </p>
        </section>
      )}
      <button
        ref={trigger}
        type="button"
        className={`experience-trigger${prefs.music && prefs.started ? ' is-playing' : ''}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={
          open
            ? 'Đóng cài đặt trải nghiệm'
            : 'Mở cài đặt âm thanh và chuyển động'
        }
        onClick={() => setOpen((value) => !value)}
      >
        <Icon
          name={prefs.music ? 'music' : prefs.effects ? 'volume' : 'mute'}
        />
        <span>Không gian học</span>
        <i className="experience-equalizer" aria-hidden="true">
          <b />
          <b />
          <b />
        </i>
      </button>
    </div>
  );
}
