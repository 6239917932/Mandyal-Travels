import type { CSSProperties } from 'react';

type MetricBarItem = Readonly<{
  label: string;
  value: number;
}>;

export function MetricBars({
  description,
  items,
  title,
}: Readonly<{ description: string; items: readonly MetricBarItem[]; title: string }>) {
  const maximum = Math.max(1, ...items.map((item) => item.value));

  return (
    <section aria-label={title} className="dashboard-chart dashboard-chart--bars">
      <header>
        <div>
          <span>Live distribution</span>
          <h2>{title}</h2>
        </div>
        <p>{description}</p>
      </header>
      <div className="dashboard-chart__bars">
        {items.map((item) => {
          const percentage = Math.max(item.value > 0 ? 6 : 0, (item.value / maximum) * 100);
          return (
            <div className="dashboard-chart__bar" key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString('en-IN')}</strong>
              </div>
              <span aria-hidden="true" className="dashboard-chart__track">
                <i style={{ '--bar-value': `${percentage}%` } as CSSProperties} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MetricDonut({
  caption,
  label,
  value,
}: Readonly<{ caption: string; label: string; value: number }>) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <section
      aria-label={`${label}: ${boundedValue}%`}
      className="dashboard-chart dashboard-chart--donut"
    >
      <div
        aria-hidden="true"
        className="dashboard-chart__donut"
        style={{ '--donut-value': `${boundedValue * 3.6}deg` } as CSSProperties}
      >
        <div>
          <strong>{boundedValue}%</strong>
          <span>{label}</span>
        </div>
      </div>
      <div className="dashboard-chart__donut-copy">
        <span>Current performance</span>
        <h2>{label}</h2>
        <p>{caption}</p>
      </div>
    </section>
  );
}
