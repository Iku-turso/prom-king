import type { PrometheusSeries } from "@k8slens/prometheus-contracts";
import type { PanelUnit } from "../dashboards/dashboard";
import { type ResourceLink, resourceLinksOf } from "../resources/resource-links";

/** Colours of the theme first, so the lines follow it; then a few fixed ones that read on light and dark alike. */
const palette = [
  "var(--blue, #3d90ce)",
  "var(--success, #48b155)",
  "var(--warning, #e58b1e)",
  "var(--critical, #ce3933)",
  "var(--code, #b05ee0)",
  "#26a69a",
  "#ec407a",
  "#7e57c2",
  "#9ccc65",
  "#ffca28",
  "#29b6f6",
  "#8d6e63",
];

/** At most this many series are drawn; a query answering with more is told so. */
export const maxDrawnSeries = 30;

export type Point = readonly [timestampSeconds: number, value: number];

export interface ChartSeries {
  readonly key: string;
  readonly name: string;
  readonly color: string;
  readonly points: readonly Point[];
  /** The latest finite sample: what a stat, a gauge, a bar, a slice or a table row shows. */
  readonly last: number | undefined;
  readonly min: number | undefined;
  readonly max: number | undefined;
  readonly average: number | undefined;
  /** The resources the series names, the most specific first: what clicking it opens. */
  readonly links: readonly ResourceLink[];
}

const labelsOf = (metric: Readonly<Record<string, string>>) => {
  const { __name__: name, ...labels } = metric;
  const pairs = Object.entries(labels).map(([label, value]) => `${label}="${value}"`);

  if (pairs.length === 0) {
    return name ?? "value";
  }

  return `${name ?? ""}{${pairs.join(", ")}}`;
};

/** A series' legend name: the template with each `{{label}}` filled in, or its labels. */
export const seriesName = (metric: Readonly<Record<string, string>>, legend: string) =>
  legend.trim() ? legend.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, label: string) => metric[label] ?? "") : labelsOf(metric);

export const colorAt = (index: number) => palette[index % palette.length]!;

export const toChartSeries = (series: readonly PrometheusSeries[], legend: string): ChartSeries[] =>
  series.slice(0, maxDrawnSeries).map((one, index) => {
    const points = one.values.map(([timestamp, value]) => [timestamp, Number(value)] as const);
    const finite = points.map(([, value]) => value).filter((value) => Number.isFinite(value));

    return {
      key: `${index}:${labelsOf(one.metric)}`,
      name: seriesName(one.metric, legend),
      color: colorAt(index),
      points,
      last: finite.at(-1),
      min: finite.length ? Math.min(...finite) : undefined,
      max: finite.length ? Math.max(...finite) : undefined,
      average: finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : undefined,
      links: resourceLinksOf(one.metric),
    };
  });

/** The series that have a latest value, the largest first: the order bars, slices and rows take. */
export const byLatestValue = (series: readonly ChartSeries[]) =>
  series
    .filter((one): one is ChartSeries & { last: number } => one.last !== undefined)
    .sort((a, b) => b.last - a.last);

/** Where a gauge or a bar is full: the panel's own maximum, 100% for a percentage, or the largest value rounded up. */
export const fullScaleOf = (unit: PanelUnit, max: number | undefined, values: readonly number[]) => {
  if (max !== undefined && max > 0) return max;
  if (unit === "percent-ratio") return Math.max(1, ...values);
  if (unit === "percent") return Math.max(100, ...values);

  const largest = Math.max(0, ...values);

  if (largest === 0) return 1;

  const power = 10 ** Math.floor(Math.log10(largest));

  return Math.ceil(largest / power) * power;
};

/**
 * The series stacked one on another, in the order given: each point carries where its band starts
 * and ends. A missing or non-finite sample counts as nothing, so the bands never tear.
 */
export const stack = (series: readonly ChartSeries[]) => {
  const timestamps = [...new Set(series.flatMap((one) => one.points.map(([timestamp]) => timestamp)))].sort((a, b) => a - b);
  const base = new Map(timestamps.map((timestamp) => [timestamp, 0]));

  return series.map((one) => {
    const values = new Map(one.points.map(([timestamp, value]) => [timestamp, Number.isFinite(value) ? value : 0]));

    const bands = timestamps.map((timestamp) => {
      const from = base.get(timestamp)!;
      const to = from + (values.get(timestamp) ?? 0);

      base.set(timestamp, to);

      return { timestamp, from, to };
    });

    return { series: one, bands };
  });
};

/** The lowest and highest finite value across the series, zero included, so every chart starts at the axis. */
export const extentOf = (series: readonly ChartSeries[]): [number, number] => {
  let min = 0;
  let max = 0;

  for (const one of series) {
    for (const [, value] of one.points) {
      if (Number.isFinite(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }

  return [min, max];
};

export interface Scale {
  readonly x: (timestamp: number) => number;
  readonly y: (value: number) => number;
}

/** Maps time and value into a 1000×1000 box. */
export const scaleOf = (start: number, end: number, min: number, max: number): Scale => ({
  x: (timestamp) => ((timestamp - start) / (end - start || 1)) * 1000,
  y: (value) => 1000 - ((value - min) / (max - min || 1)) * 1000,
});

/** An SVG path through the points, broken where a value is missing or not finite. */
export const linePathOf = (points: readonly Point[], scale: Scale, step: number) => {
  let path = "";
  let previous: number | undefined;

  for (const [timestamp, value] of points) {
    if (!Number.isFinite(value)) {
      previous = undefined;
      continue;
    }

    // A gap wider than a couple of steps is missing data, not a line to draw across.
    const joins = previous !== undefined && timestamp - previous <= step * 2.5;

    path += `${joins ? "L" : "M"}${scale.x(timestamp).toFixed(1)},${scale.y(value).toFixed(1)}`;
    previous = timestamp;
  }

  return path;
};

/** A stacked band as a closed SVG path: along its top edge, then back along its bottom. */
export const bandPathOf = (bands: readonly { timestamp: number; from: number; to: number }[], scale: Scale) => {
  if (bands.length === 0) {
    return { area: "", line: "" };
  }

  const top = bands.map(({ timestamp, to }) => `${scale.x(timestamp).toFixed(1)},${scale.y(to).toFixed(1)}`);
  const bottom = [...bands].reverse().map(({ timestamp, from }) => `${scale.x(timestamp).toFixed(1)},${scale.y(from).toFixed(1)}`);

  return { area: `M${top.join("L")}L${bottom.join("L")}Z`, line: `M${top.join("L")}` };
};

/** The value of a series at the sample nearest to the time, if it has one there. */
export const valueAt = (series: ChartSeries, timestamp: number, step: number) => {
  let nearest: Point | undefined;

  for (const point of series.points) {
    if (!nearest || Math.abs(point[0] - timestamp) < Math.abs(nearest[0] - timestamp)) {
      nearest = point;
    }
  }

  return nearest && Math.abs(nearest[0] - timestamp) <= step && Number.isFinite(nearest[1]) ? nearest[1] : undefined;
};

/** How full a gauge or bar is, as the colour of the theme's status: fine, getting there, or nearly out. */
export const severityColor = (fraction: number) =>
  fraction >= 0.9 ? "var(--critical, #ce3933)" : fraction >= 0.75 ? "var(--warning, #e58b1e)" : "var(--success, #48b155)";
