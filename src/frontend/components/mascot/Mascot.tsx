export type MascotMood =
  'welcome' | 'thinking' | 'celebrate' | 'rest' | 'encourage';

interface Props {
  mood?: MascotMood;
  message?: string;
  className?: string;
  compact?: boolean;
}

export default function Mascot({
  mood = 'welcome',
  message,
  className = '',
  compact = false,
}: Props) {
  return (
    <div
      className={`mascot mascot--${mood}${compact ? ' mascot--compact' : ''} ${className}`}
    >
      {message && <p className="mascot-bubble">{message}</p>}
      <div className="mascot-figure" aria-hidden="true">
        <img
          src="/images/mascot/englishvocab-mascot.png"
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
