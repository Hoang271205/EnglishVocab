import type { Level } from '../../../domain/types';
import type { CSSProperties } from 'react';
import InfoPopover from '../ui/InfoPopover';

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
    <figure className="memory-distribution">
      <figcaption>
        <h2>
          Mức ghi nhớ của bạn <InfoPopover term="Level" />
        </h2>
        <p>Phân bố {total.toLocaleString('vi-VN')} từ đã học theo Level 1–5.</p>
      </figcaption>

      {total > 0 ? (
        <div
          className="memory-chart"
          style={
            {
              '--memory-count-width': `${Math.max(50, (total.toLocaleString('vi-VN').length + 3) * 11)}px`,
            } as CSSProperties
          }
        >
          <div className="memory-chart-scale" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((tick) => (
              <span key={tick}>{(tick * step).toLocaleString('vi-VN')}</span>
            ))}
          </div>
          <ol
            className="memory-chart-rows"
            aria-label="Số từ theo level ghi nhớ"
          >
            {levels.map((level) => {
              const count = counts[level];
              const width = (count / maximum) * 100;

              return (
                <li className="memory-chart-row" key={level}>
                  <span className="memory-chart-label">Level {level}</span>
                  <div className="memory-chart-track" aria-hidden="true">
                    <div
                      className={`memory-chart-fill${level === 5 ? ' memory-chart-fill--maintain' : ''}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>

                  <strong className="memory-chart-count">
                    {count.toLocaleString('vi-VN')} <span>từ</span>
                  </strong>
                </li>
              );
            })}
          </ol>
          <p className="memory-chart-axis">Chiều dài thanh thể hiện số từ</p>
        </div>
      ) : (
        <p className="memory-chart-empty">
          Học những từ đầu tiên để bắt đầu theo dõi mức ghi nhớ tại đây.
        </p>
      )}

      <p className="memory-chart-note">
        Level là mức ghi nhớ, khác với trình độ CEFR. Từ ở Level 5 vẫn có lịch
        ôn duy trì.
        <InfoPopover term="CEFR" />
      </p>
    </figure>
  );
}
