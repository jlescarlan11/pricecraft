import React from 'react';

interface PriceSparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

export const PriceSparkline: React.FC<PriceSparklineProps> = ({
  values,
  width = 80,
  height = 24,
}) => {
  if (values.length < 2) {
    return <span className="text-xs text-ink-400">—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = values[values.length - 1];
  const first = values[0];
  const trend = last > first ? 'rising' : last < first ? 'falling' : 'flat';
  const stroke =
    trend === 'rising'
      ? 'var(--color-rust, #b85450)'
      : trend === 'falling'
        ? 'var(--color-moss, #5a7a3a)'
        : '#888';
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Price trend ${trend}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
