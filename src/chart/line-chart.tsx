import { Div, Span } from "@k8slens/element-components";
import { useInject } from "@k8slens/use-inject";
import { observer } from "mobx-react";
import type { PanelUnit } from "../dashboards/dashboard";
import { openResourceInjectionToken } from "../resources/open-resource.injectable";
import { linkLabel } from "../resources/resource-links";
import { chartHoverInjectable } from "./chart-hover.injectable";
import { bandPathOf, type ChartSeries, extentOf, linePathOf, scaleOf, stack, valueAt } from "./chart-series";
import { formatTime, formatValue, niceTicks } from "./format";
import styles from "./line-chart.module.scss";

export interface TimeSeriesChartProps {
  readonly clusterId: string;
  /** What the pointer's position over this chart is kept under. */
  readonly chartKey: string;
  readonly series: readonly ChartSeries[];
  readonly start: number;
  readonly end: number;
  readonly step: number;
  readonly unit: PanelUnit;
  /** Stacks the series as filled bands, to show how they add up to a total. */
  readonly stacked: boolean;
}

const xTickCount = 5;
const maxTooltipRows = 12;

/**
 * Series over time, drawn in a box that stretches to whatever it is given: the lines scale with
 * it, the labels are laid over it in the page's own type, so nothing needs measuring.
 */
export const TimeSeriesChart = observer(({ clusterId, chartKey, series, start, end, step, unit, stacked }: TimeSeriesChartProps) => {
  const hover = useInject(chartHoverInjectable)(chartKey);
  const openResource = useInject(openResourceInjectionToken)();
  const stacks = stacked ? stack(series) : [];
  const [low, high] = stacked
    ? [0, Math.max(0, ...stacks.flatMap(({ bands }) => bands.map((band) => band.to)))]
    : extentOf(series);
  const ticks = niceTicks(low, high);
  const min = ticks[0]!;
  const max = ticks.at(-1)!;
  const scale = scaleOf(start, end, min, max);
  const span = end - start || 1;
  const pointer = hover.at.get();
  const hoveredTime = pointer === undefined ? undefined : start + Math.round((pointer.x * span) / step) * step;
  const tickLabels = ticks.map((tick) => formatValue(unit, tick));
  const longestTickLabel = tickLabels.reduce((longest, label) => (label.length > longest.length ? label : longest), "");

  const hoveredValues =
    hoveredTime === undefined
      ? []
      : series
          .map((one) => ({ one, value: valueAt(one, hoveredTime, step) }))
          .filter((entry): entry is { one: ChartSeries; value: number } => entry.value !== undefined)
          .sort((a, b) => b.value - a.value);

  const hoveredTotal = hoveredValues.reduce((sum, { value }) => sum + value, 0);

  // The series under the pointer: the band it is inside when stacked, the nearest line otherwise.
  const pointedSeries = (() => {
    if (pointer === undefined || hoveredTime === undefined) return undefined;

    const pointerValue = min + (1 - pointer.y) * (max - min);

    if (stacked) {
      const nearestIndex = (bands: readonly { timestamp: number }[]) =>
        bands.reduce(
          (best, band, index) =>
            Math.abs(band.timestamp - hoveredTime) < Math.abs(bands[best]!.timestamp - hoveredTime) ? index : best,
          0,
        );

      return stacks.find(({ bands }) => {
        const band = bands[nearestIndex(bands)];

        return band && band.to > band.from && pointerValue >= band.from && pointerValue <= band.to;
      })?.series;
    }

    return hoveredValues.reduce<{ one: ChartSeries; value: number } | undefined>(
      (nearest, entry) =>
        !nearest || Math.abs(entry.value - pointerValue) < Math.abs(nearest.value - pointerValue) ? entry : nearest,
      undefined,
    )?.one;
  })();

  const pointedLink = pointedSeries?.links[0];
  const hoveredFraction = hoveredTime === undefined ? undefined : (hoveredTime - start) / span;

  return (
    <Div $className={styles.chart}>
      <Div $className={styles.yAxis}>
        <Div $className={styles.yAxisSizer} aria-hidden>
          {longestTickLabel}
        </Div>

        {ticks.map((tick, index) => (
          <Span key={tick} $className={styles.yLabel} $style={{ top: `${(scale.y(tick) / 1000) * 100}%` }}>
            {tickLabels[index]}
          </Span>
        ))}
      </Div>

      <Div
        $className={styles.plot}
        $style={{ cursor: pointedLink ? "pointer" : undefined }}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const clamp = (value: number) => Math.min(1, Math.max(0, value));

          hover.set({
            x: clamp((event.clientX - box.left) / (box.width || 1)),
            y: clamp((event.clientY - box.top) / (box.height || 1)),
          });
        }}
        onMouseLeave={() => hover.set(undefined)}
        onClick={() => pointedLink && void openResource(clusterId, pointedLink)}
      >
        <svg className={styles.svg} viewBox="0 0 1000 1000" preserveAspectRatio="none">
          {ticks.map((tick) => (
            <line
              key={tick}
              className={styles.grid}
              x1={0}
              x2={1000}
              y1={scale.y(tick)}
              y2={scale.y(tick)}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {stacked
            ? stacks.map(({ series: one, bands }) => {
                const { area, line } = bandPathOf(bands, scale);

                const dimmed = pointedSeries !== undefined && pointedSeries !== one;

                return (
                  <g key={one.key} opacity={dimmed ? 0.45 : 1}>
                    <path className={styles.area} d={area} fill={one.color} />
                    <path
                      className={styles.line}
                      d={line}
                      stroke={one.color}
                      strokeWidth={pointedSeries === one ? 2.5 : undefined}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })
            : series.map((one) => (
                <path
                  key={one.key}
                  className={styles.line}
                  d={linePathOf(one.points, scale, step)}
                  stroke={one.color}
                  strokeWidth={pointedSeries === one ? 2.75 : undefined}
                  opacity={pointedSeries !== undefined && pointedSeries !== one ? 0.4 : 1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

          {hoveredFraction !== undefined && (
            <line
              className={styles.cursor}
              x1={hoveredFraction * 1000}
              x2={hoveredFraction * 1000}
              y1={0}
              y2={1000}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {hoveredTime !== undefined && hoveredFraction !== undefined && (
          <Div
            $className={styles.tooltip}
            $style={hoveredFraction > 0.5 ? { right: `${(1 - hoveredFraction) * 100 + 2}%` } : { left: `${hoveredFraction * 100 + 2}%` }}
          >
            <Div $font={{ bold: true }} $margin={{ bottom: "xs" }}>
              {new Date(hoveredTime * 1000).toLocaleString()}
            </Div>

            {hoveredValues.length === 0 && <Div>No samples</Div>}

            {hoveredValues.slice(0, maxTooltipRows).map(({ one, value }) => (
              <Div key={one.key} $className={styles.tooltipRow} $style={{ opacity: pointedSeries && pointedSeries !== one ? 0.6 : 1 }}>
                <Span $className={styles.swatch} $style={{ background: one.color }} />
                <Span $className={styles.tooltipName}>{one.name}</Span>
                <Span $className={styles.tooltipValue}>{formatValue(unit, value)}</Span>
              </Div>
            ))}

            {hoveredValues.length > maxTooltipRows && <Div>…and {hoveredValues.length - maxTooltipRows} more</Div>}

            {pointedLink && (
              <Div $margin={{ top: "xs" }} $style={{ opacity: 0.75 }}>
                Click to open {linkLabel(pointedLink)}
              </Div>
            )}

            {stacked && hoveredValues.length > 1 && (
              <Div $className={styles.tooltipRow} $margin={{ top: "xs" }}>
                <Span $className={styles.tooltipName}>Total</Span>
                <Span $className={styles.tooltipValue}>{formatValue(unit, hoveredTotal)}</Span>
              </Div>
            )}
          </Div>
        )}
      </Div>

      <Div $className={styles.xAxis}>
        {Array.from({ length: xTickCount }, (_, index) => {
          const at = index / (xTickCount - 1);

          return (
            <Span key={index} $className={styles.xLabel} $style={{ left: `${at * 100}%` }}>
              {formatTime(start + at * span, span)}
            </Span>
          );
        })}
      </Div>
    </Div>
  );
});
