"use client";

import { useMemo, useState } from "react";

export interface SimpleLinePoint {
  dateKey: string;
  value: number;
}

interface SimpleLineChartProps {
  title: string;
  points: SimpleLinePoint[];
  valueFormatter?: (value: number) => string;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const PADDING_LEFT = 44;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 36;

export function SimpleLineChart({
  title,
  points,
  valueFormatter = (value) => value.toLocaleString(),
}: SimpleLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { pathD, plottedPoints, yTicks } = useMemo(() => {
    if (points.length === 0) {
      return {
        pathD: "",
        plottedPoints: [] as { x: number; y: number; point: SimpleLinePoint }[],
        yTicks: [] as number[],
      };
    }

    const chartWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    const values = points.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const span = Math.max(maxValue - minValue, 1);
    const paddedMin = Math.max(0, minValue - span * 0.1);
    const paddedMax = maxValue + span * 0.1;
    const paddedSpan = Math.max(paddedMax - paddedMin, 1);

    const mapped = points.map((point, index) => {
      const x =
        PADDING_LEFT +
        (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
      const y =
        PADDING_TOP +
        chartHeight -
        ((point.value - paddedMin) / paddedSpan) * chartHeight;
      return { x, y, point };
    });

    const path = mapped
      .map((mappedPoint, index) => `${index === 0 ? "M" : "L"} ${mappedPoint.x} ${mappedPoint.y}`)
      .join(" ");

    const ticks = [0, 1, 2, 3, 4].map((step) => paddedMin + (paddedSpan * step) / 4);

    return {
      pathD: path,
      plottedPoints: mapped,
      yTicks: ticks,
    };
  }, [points]);

  const hoveredPoint = hoveredIndex === null ? null : plottedPoints[hoveredIndex] ?? null;

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</h4>
        {hoveredPoint ? (
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            {hoveredPoint.point.dateKey}: {valueFormatter(hoveredPoint.point.value)}
          </div>
        ) : null}
      </div>

      {points.length === 0 ? (
        <div className="rounded-lg bg-zinc-50 px-3 py-8 text-center text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          No history in this range.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-56 w-full"
          role="img"
          aria-label={title}
        >
          {yTicks.map((tick) => {
            const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
            const minTick = yTicks[0];
            const maxTick = yTicks[yTicks.length - 1];
            const ratio = maxTick === minTick ? 0 : (tick - minTick) / (maxTick - minTick);
            const y = PADDING_TOP + chartHeight - ratio * chartHeight;

            return (
              <g key={tick}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y2={y}
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                  strokeWidth="1"
                />
                <text
                  x={PADDING_LEFT - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
                >
                  {valueFormatter(Math.round(tick))}
                </text>
              </g>
            );
          })}

          <line
            x1={PADDING_LEFT}
            y1={CHART_HEIGHT - PADDING_BOTTOM}
            x2={CHART_WIDTH - PADDING_RIGHT}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            className="stroke-zinc-300 dark:stroke-zinc-700"
            strokeWidth="1"
          />

          <path d={pathD} className="fill-none stroke-red-500" strokeWidth="2" />

          {plottedPoints.map((point, index) => (
            <circle
              key={point.point.dateKey}
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 4 : 3}
              className="cursor-pointer fill-red-500"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          <text
            x={PADDING_LEFT}
            y={CHART_HEIGHT - 8}
            className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
          >
            {points[0]?.dateKey}
          </text>
          <text
            x={CHART_WIDTH - PADDING_RIGHT}
            y={CHART_HEIGHT - 8}
            textAnchor="end"
            className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
          >
            {points[points.length - 1]?.dateKey}
          </text>
        </svg>
      )}
    </div>
  );
}
