import Icon from '../ui/Icon';

export type MascotMood =
  'welcome' | 'thinking' | 'celebrate' | 'rest' | 'encourage';

interface Props {
  mood?: MascotMood;
  message?: string;
  messageTitle?: string;
  messageLabel?: string;
  className?: string;
  compact?: boolean;
}

export default function Mascot({
  mood = 'welcome',
  message,
  messageTitle,
  messageLabel,
  className = '',
  compact = false,
}: Props) {
  return (
    <div
      className={`mascot mascot--${mood}${compact ? ' mascot--compact' : ''} ${className}`}
    >
      {message &&
        (messageTitle ? (
          <div className="mascot-bubble mascot-bubble--note">
            {messageLabel && (
              <span className="mascot-note-label">
                <Icon name="sprout" />
                {messageLabel}
              </span>
            )}
            <strong className="mascot-note-title">{messageTitle}</strong>
            <p className="mascot-note-copy">{message}</p>
          </div>
        ) : (
          <p className="mascot-bubble">{message}</p>
        ))}
      <div className="mascot-figure" aria-hidden="true">
        <img
          src="/images/mascot/englishvocab-mascot.webp"
          srcSet="/images/mascot/englishvocab-mascot-small.webp 320w, /images/mascot/englishvocab-mascot.webp 640w"
          sizes={
            compact
              ? '(max-width: 600px) 110px, 180px'
              : '(max-width: 600px) 220px, 320px'
          }
          alt=""
          width="260"
          height="240"
          decoding="async"
          draggable={false}
        />
        <span className="mascot-ground" />
        {mood === 'celebrate' && (
          <span className="mascot-leaves">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
    </div>
  );
}
