import type { CSSProperties } from 'react';
import type { Level } from '../../../domain/types';

export type LevelCounts = Record<Level, number>;

type LevelDistributionProps = {
  counts: LevelCounts;
};

const levels: Level[] = [1, 2, 3, 4, 5];

export default function LevelDistribution({ counts }: LevelDistributionProps) {
  const largest = Math.max(1, ...levels.map((level) => counts[level]));
  const magnitude = 10 ** Math.floor(Math.log10(largest / 4));
  const step = Math.max(
    1,
    [1, 2, 5, 10].find((value) => value * magnitude >= largest / 4)! *
      magnitude,
  );
  const maximum = step * 4;
  const total = levels.reduce((sum, level) => sum + counts[level], 0);

  return (
    <figure className="level-distribution">
      <figcaption>
        <h2>Level ghi nhớ của bạn</h2>
        <p>
          <strong>{total.toLocaleString('vi-VN')}</strong> từ đã học
        </p>
      </figcaption>

      {total > 0 && (
        <div className="level-chart-plot">
          <div className="level-chart-grid" aria-hidden="true">
            {[4, 3, 2, 1, 0].map((tick) => (
              <span key={tick}>{(tick * step).toLocaleString('vi-VN')}</span>
            ))}
          </div>
          <ol className="level-chart" aria-label="Số từ theo level ghi nhớ">
            {levels.map((level) => {
              const count = counts[level];
              const height = (count / maximum) * 100;

              return (
                <li
                  className="level-chart-column"
                  key={level}
                  style={{ '--bar-height': `${height}%` } as CSSProperties}
                >
                  <strong className="level-chart-count">
                    {count.toLocaleString('vi-VN')}
                    <span className="level-chart-unit"> từ</span>
                  </strong>

                  <div className="level-chart-track" aria-hidden="true">
                    <div
                      className={`level-chart-fill level-chart-fill-${level}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>

                  <span className="level-chart-label">Level {level}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {total === 0 && (
        <p className="level-chart-empty">
          Biểu đồ sẽ lớn dần cùng những từ bạn học.
        </p>
      )}

      <p className="level-chart-note">
        Level 1–5 thể hiện mức ghi nhớ, khác với trình độ CEFR.
      </p>
    </figure>
  );
}
