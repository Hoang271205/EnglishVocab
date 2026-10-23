import type { Level } from '../../../domain/types';

export type LevelCounts = Record<Level, number>;

type LevelDistributionProps = {
  counts: LevelCounts;
};

const levels: Level[] = [1, 2, 3, 4, 5];

export default function LevelDistribution({ counts }: LevelDistributionProps) {
  const maximum = Math.max(1, ...levels.map((level) => counts[level]));
  const total = levels.reduce((sum, level) => sum + counts[level], 0);

  return (
    <figure className="level-distribution">
      <figcaption>
        <h2>Level ghi nhớ của bạn</h2>
        <p>{total} từ đã học</p>
      </figcaption>

      <ol className="level-chart" aria-label="Số từ theo level ghi nhớ">
        {levels.map((level) => {
          const count = counts[level];
          const height = (count / maximum) * 100;

          return (
            <li className="level-chart-column" key={level}>
              <strong className="level-chart-count">
                {count}
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

      <p className="level-chart-note">
        Level 1–5 thể hiện mức ghi nhớ, khác với trình độ CEFR.
      </p>
    </figure>
  );
}
