import { Div, Span } from "@k8slens/element-components";
import type { PanelUnit } from "../dashboards/dashboard";
import { byLatestValue, type ChartSeries, fullScaleOf, linePathOf, scaleOf, severityColor } from "./chart-series";
import { useInject } from "@k8slens/use-inject";
import { openResourceInjectionToken } from "../resources/open-resource.injectable";
import { SeriesName } from "../resources/series-name.injectable";
import { formatValue } from "./format";
import styles from "./value-charts.module.scss";

export interface ValueChartProps {
  readonly clusterId: string;
  readonly series: readonly ChartSeries[];
  readonly unit: PanelUnit;
  /** Where a gauge or a bar is full, when the panel says. */
  readonly max: number | undefined;
  readonly step: number;
}

const isPercent = (unit: PanelUnit) => unit === "percent" || unit === "percent-ratio";

/** Each series' latest value as a bar, the largest on top; a percentage is coloured by how full it is. */
export const BarGauge = ({ clusterId, series, unit, max }: ValueChartProps) => {
  const openResource = useInject(openResourceInjectionToken)();
  const rows = byLatestValue(series);
  const fullScale = fullScaleOf(unit, max, rows.map((row) => row.last));

  return (
    <Div $className={styles.scroll}>
      <Div $className={styles.bars}>
        {rows.map((row) => {
          const fraction = Math.max(0, Math.min(1, row.last / fullScale));

          return (
            <Div key={row.key} $className={styles.bar}>
              <SeriesName clusterId={clusterId} links={row.links} $className={styles.barName} $tooltip={row.name}>
                {row.name}
              </SeriesName>

              <Div
                $className={styles.barTrack}
                $cursor={row.links[0] ? "pointer" : undefined}
                onClick={() => row.links[0] && void openResource(clusterId, row.links[0])}
              >
                <Div
                  $className={styles.barFill}
                  $style={{
                    width: `${fraction * 100}%`,
                    background: isPercent(unit) || max !== undefined ? severityColor(fraction) : row.color,
                  }}
                />
              </Div>

              <Span $className={styles.barValue}>{formatValue(unit, row.last)}</Span>
            </Div>
          );
        })}
      </Div>
    </Div>
  );
};

const Sparkline = ({ one, step }: { one: ChartSeries; step: number }) => {
  const finite = one.points.filter(([, value]) => Number.isFinite(value));

  if (finite.length < 2) {
    return null;
  }

  const start = finite[0]![0];
  const end = finite.at(-1)![0];
  const low = Math.min(...finite.map(([, value]) => value));
  const high = Math.max(...finite.map(([, value]) => value));
  // A little room below the lowest point, so a flat line does not lie on the floor.
  const scale = scaleOf(start, end, low - (high - low || 1) * 0.15, high);
  const line = linePathOf(one.points, scale, step);

  return (
    <svg className={styles.sparkline} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden>
      <path d={`${line}L1000,1000L0,1000Z`} fill={one.color} opacity={0.15} />
      <path d={line} fill="none" stroke={one.color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/** Each series' latest value, large, over a sparkline of how it got there. */
export const Stat = ({ clusterId, series, unit, step }: ValueChartProps) => (
  <Div $className={styles.stats}>
    {series.slice(0, 8).map((one) => (
      <Div key={one.key} $className={styles.stat}>
        <Sparkline one={one} step={step} />
        <Span $className={styles.statValue}>{one.last === undefined ? "–" : formatValue(unit, one.last)}</Span>
        {(series.length > 1 || one.name !== "value") && (
          <SeriesName clusterId={clusterId} links={one.links} $className={styles.statName}>
            {one.name}
          </SeriesName>
        )}
      </Div>
    ))}
  </Div>
);

const gaugeSweep = 240;
const gaugeStart = 150;
const radius = 80;
const center = { x: 100, y: 96 };

const pointAt = (angle: number) => {
  const radians = (angle * Math.PI) / 180;

  return `${(center.x + radius * Math.cos(radians)).toFixed(2)},${(center.y + radius * Math.sin(radians)).toFixed(2)}`;
};

const arcOf = (fraction: number) => {
  const sweep = gaugeSweep * Math.max(0.0001, Math.min(1, fraction));

  return `M${pointAt(gaugeStart)}A${radius},${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${pointAt(gaugeStart + sweep)}`;
};

/** Each series' latest value as a dial filling towards its full scale, coloured by how full it is. */
export const Gauge = ({ clusterId, series, unit, max }: ValueChartProps) => {
  const shown = byLatestValue(series).slice(0, 6);
  const fullScale = fullScaleOf(unit, max, shown.map((one) => one.last));

  return (
    <Div $className={styles.gauges}>
      {shown.map((one) => {
        const fraction = one.last / fullScale;

        return (
          <Div key={one.key} $className={styles.gauge}>
            <svg className={styles.gaugeSvg} viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet">
              <path className={styles.gaugeTrack} d={arcOf(1)} strokeWidth={16} />
              <path className={styles.gaugeFill} d={arcOf(fraction)} strokeWidth={16} stroke={severityColor(fraction)} />
              <text className={styles.gaugeValue} x={center.x} y={center.y + 10} textAnchor="middle" fontSize={30}>
                {formatValue(unit, one.last)}
              </text>
              <text x={center.x} y={center.y + 48} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.5}>
                of {formatValue(unit, fullScale)}
              </text>
            </svg>

            {(shown.length > 1 || one.name !== "value") && (
              <SeriesName clusterId={clusterId} links={one.links} $className={styles.gaugeName}>
                {one.name}
              </SeriesName>
            )}
          </Div>
        );
      })}
    </Div>
  );
};

/** How each series' latest value divides the whole, with the whole in the middle. */
export const Donut = ({ clusterId, series, unit }: ValueChartProps) => {
  const openResource = useInject(openResourceInjectionToken)();
  const slices = byLatestValue(series).filter((one) => one.last > 0);
  const total = slices.reduce((sum, one) => sum + one.last, 0);
  const circumference = 2 * Math.PI * 40;
  let offset = 0;

  return (
    <Div $className={styles.donut}>
      <svg className={styles.donutSvg} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={40} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={14} />

        {slices.map((one) => {
          const length = (one.last / (total || 1)) * circumference;
          // A hairline between neighbours, so slices of one colour family stay apart.
          const gap = slices.length > 1 ? Math.min(1.2, length / 3) : 0;
          const dash = `${Math.max(0, length - gap)} ${circumference - Math.max(0, length - gap)}`;
          const slice = (
            <circle
              key={one.key}
              cx={50}
              cy={50}
              r={40}
              fill="none"
              stroke={one.color}
              strokeWidth={14}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
              style={{ cursor: one.links[0] ? "pointer" : undefined }}
              onClick={() => one.links[0] && void openResource(clusterId, one.links[0])}
            >
              <title>{`${one.name}: ${formatValue(unit, one.last)}`}</title>
            </circle>
          );

          offset += length;

          return slice;
        })}

        <text className={styles.donutTotal} x={50} y={52} textAnchor="middle" fontSize={16}>
          {formatValue(unit, total)}
        </text>
        <text className={styles.donutCaption} x={50} y={64} textAnchor="middle" fontSize={7}>
          total
        </text>
      </svg>

      <Div $className={styles.donutLegend}>
        {byLatestValue(series).map((one) => (
          <Div key={one.key} $className={styles.donutRow}>
            <Span $className={styles.swatch} $style={{ background: one.color, opacity: one.last > 0 ? 1 : 0.3 }} />
            <SeriesName clusterId={clusterId} links={one.links} $className={styles.ellipsis} $tooltip={one.name}>
              {one.name}
            </SeriesName>
            <Span $className={styles.number}>{formatValue(unit, one.last)}</Span>
            <Span $className={[styles.number, styles.muted]}>
              {total > 0 ? `${Math.round((one.last / total) * 100)}%` : "–"}
            </Span>
          </Div>
        ))}
      </Div>
    </Div>
  );
};

/** One row per series, the largest latest value first, with its average and peak over the range. */
export const ValueTable = ({ clusterId, series, unit }: ValueChartProps) => (
  <Div $className={styles.scroll}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Series</th>
          <th>Current</th>
          <th>Average</th>
          <th>Max</th>
        </tr>
      </thead>

      <tbody>
        {byLatestValue(series).map((one) => (
          <tr key={one.key}>
            <td className={styles.ellipsis} title={one.name}>
              <span className={styles.lineSwatch} style={{ background: one.color }} />
              <SeriesName clusterId={clusterId} links={one.links}>
                {one.name}
              </SeriesName>
            </td>
            <td className={styles.number}>
              <b>{formatValue(unit, one.last)}</b>
            </td>
            <td className={styles.number}>{one.average === undefined ? "–" : formatValue(unit, one.average)}</td>
            <td className={styles.number}>{one.max === undefined ? "–" : formatValue(unit, one.max)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Div>
);
