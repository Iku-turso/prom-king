import type { PanelUnit } from "../dashboards/dashboard";

const trim = (value: number, digits: number) => {
  const fixed = value.toFixed(digits);

  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
};

const scaled = (value: number, base: number, suffixes: readonly string[], digits = 2) => {
  let index = 0;
  let magnitude = Math.abs(value);

  while (magnitude >= base && index < suffixes.length - 1) {
    magnitude /= base;
    index += 1;
  }

  return `${value < 0 ? "-" : ""}${trim(magnitude, digits)}${suffixes[index]}`;
};

const seconds = (value: number) => {
  const magnitude = Math.abs(value);

  if (magnitude === 0) return "0s";
  if (magnitude < 0.001) return `${trim(value * 1e6, 1)}µs`;
  if (magnitude < 1) return `${trim(value * 1000, 1)}ms`;
  if (magnitude < 60) return `${trim(value, 2)}s`;
  if (magnitude < 3600) return `${trim(value / 60, 1)}m`;
  if (magnitude < 86400) return `${trim(value / 3600, 1)}h`;

  return `${trim(value / 86400, 1)}d`;
};

/** A value as a person reads it, in the panel's unit. */
export const formatValue = (unit: PanelUnit, value: number): string => {
  if (Number.isNaN(value)) return "NaN";
  if (!Number.isFinite(value)) return value > 0 ? "+Inf" : "-Inf";

  switch (unit) {
    case "bytes":
      return scaled(value, 1024, ["B", "KiB", "MiB", "GiB", "TiB", "PiB"], 1);
    case "bytes-per-second":
      return `${scaled(value, 1024, ["B", "KiB", "MiB", "GiB", "TiB"], 1)}/s`;
    case "percent-ratio":
      return `${trim(value * 100, 1)}%`;
    case "percent":
      return `${trim(value, 1)}%`;
    case "seconds":
      return seconds(value);
    case "cores":
      return Math.abs(value) < 1 && value !== 0 ? `${trim(value * 1000, 0)}m` : trim(value, 2);
    case "per-second":
      return `${scaled(value, 1000, ["", "k", "M", "G", "T"])}/s`;
    default:
      return Math.abs(value) < 1000 ? trim(value, 3) : scaled(value, 1000, ["", "k", "M", "G", "T", "P"]);
  }
};

/** A time on the axis: the clock for a range within a day, the date too for a longer one. */
export const formatTime = (timestampSeconds: number, rangeSeconds: number) => {
  const date = new Date(timestampSeconds * 1000);

  return rangeSeconds > 86400
    ? date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

/** Ticks at round numbers covering `[min, max]`, about `count` of them. */
export const niceTicks = (min: number, max: number, count = 4): number[] => {
  if (min === max) {
    return max === 0 ? [0, 1] : [Math.min(0, min), Math.max(0, max) || 1];
  }

  const rough = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? rough;
  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;
  const ticks: number[] = [];

  for (let tick = first; tick <= last + step / 2; tick += step) {
    ticks.push(Number(tick.toPrecision(12)));
  }

  return ticks;
};
