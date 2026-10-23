type SkeletonVariant =
  'auth' | 'dashboard' | 'list' | 'session' | 'form' | 'detail' | 'chart';

interface Props {
  label: string;
  variant?: SkeletonVariant;
  rows?: number;
}

function Block({ shape = 'line' }: { shape?: string }) {
  return <span className={`skeleton-block skeleton-block--${shape}`} />;
}

function Fields({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-field" key={index}>
          <Block shape="short" />
          <Block shape="input" />
        </div>
      ))}
    </>
  );
}

export default function LoadingSkeleton({
  label,
  variant = 'list',
  rows = 4,
}: Props) {
  const count = Math.max(1, Math.min(6, rows));
  return (
    <div
      className={`loading-skeleton loading-skeleton--${variant}`}
      role="status"
      aria-busy="true"
    >
      <span className="skeleton-sr-only">{label}</span>
      <div className="skeleton-content" aria-hidden="true">
        {variant === 'auth' || variant === 'form' ? (
          <>
            {variant === 'auth' && (
              <div className="skeleton-copy">
                <Block shape="heading" />
                <Block />
              </div>
            )}
            <Fields count={variant === 'auth' ? 2 : 3} />
            <Block shape="button" />
            <Block shape="short" />
          </>
        ) : variant === 'dashboard' ? (
          <>
            <div className="skeleton-stats">
              {[0, 1, 2].map((index) => (
                <div className="skeleton-stat" key={index}>
                  <Block shape="avatar" />
                  <Block shape="number" />
                  <Block shape="short" />
                </div>
              ))}
            </div>
            <div className="skeleton-card">
              <Block shape="heading" />
              <Block />
              <Block shape="button" />
            </div>
            <div className="skeleton-card">
              <Block shape="heading" />
              <Block shape="chart" />
            </div>
          </>
        ) : variant === 'session' ? (
          <>
            <div className="skeleton-toolbar">
              <Block shape="short" />
              <Block shape="pill" />
            </div>
            <Block shape="progress" />
            <div className="skeleton-card skeleton-session-card">
              <Block shape="short" />
              <Block shape="title" />
              <div className="skeleton-copy">
                <Block />
                <Block shape="medium" />
              </div>
              <Block shape="input" />
              <div className="skeleton-toolbar">
                <Block shape="pill" />
                <Block shape="pill" />
              </div>
            </div>
          </>
        ) : variant === 'list' || variant === 'chart' ? (
          <div
            className={variant === 'chart' ? 'skeleton-grid' : 'skeleton-list'}
          >
            {Array.from({ length: count }, (_, index) => (
              <div className="skeleton-row" key={index}>
                <Block shape="avatar" />
                <div className="skeleton-copy">
                  <Block shape="medium" />
                  <Block />
                  <Block shape="short" />
                </div>
                {variant === 'list' && <Block shape="pill" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="skeleton-copy">
            <Block shape="heading" />
            <Block />
            <Block shape="medium" />
            <Block shape="short" />
          </div>
        )}
      </div>
    </div>
  );
}
