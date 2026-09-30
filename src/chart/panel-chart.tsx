import { Div, Span } from "@k8slens/element-components";
import { SpinnerIcon } from "@k8slens/icon";
import { useInject } from "@k8slens/use-inject";
import { observer } from "mobx-react";
import type { ReactNode } from "react";
import { type ChartType, type PanelUnit, stepFor, timeRangeLabel } from "../dashboards/dashboard";
import { maxDrawnSeries, toChartSeries } from "./chart-series";
import { SeriesName } from "../resources/series-name.injectable";
import { formatValue } from "./format";
import { TimeSeriesChart } from "./line-chart";
import { loadedOf, panelDataInjectable, panelQueryKey, type PanelQuery } from "./panel-data.injectable";
import { BarGauge, Donut, Gauge, Stat, ValueTable } from "./value-charts";

export interface PanelChartProps {
  readonly chartKey: string;
  readonly panelQuery: PanelQuery;
  readonly chartType: ChartType;
  readonly unit: PanelUnit;
  readonly legend: string;
  readonly max: number | undefined;
}

const Message = ({ children, color }: { children: ReactNode; color?: "critical" | "textMuted" }) => (
  <Div $flex={{ direction: "vertical", horizontalAlign: "center", verticalAlign: "center" }} $height="full" $padding="s">
    <Span $color={color ?? "textMuted"} $textAlign="center" $font={{ size: "s" }} $style={{ wordBreak: "break-word" }}>
      {children}
    </Span>
  </Div>
);

const valueCharts = { "bar-gauge": BarGauge, stat: Stat, gauge: Gauge, donut: Donut, table: ValueTable } as const;

/** A query's series drawn the way the panel says, or what stands in their way. */
export const PanelChart = observer(({ chartKey, panelQuery, chartType, unit, legend, max }: PanelChartProps) => {
  const data = useInject(panelDataInjectable)(panelQueryKey(panelQuery)).state.get();
  const loaded = loadedOf(data);
  const step = stepFor(panelQuery.timeRange);

  if (data.status === "error") {
    return <Message color="critical">{data.reason}</Message>;
  }

  if (!loaded) {
    return (
      <Message>
        <SpinnerIcon $size="l" />
      </Message>
    );
  }

  if (loaded.series.length === 0) {
    return <Message>Nothing matches this query in the {timeRangeLabel(panelQuery.timeRange).toLowerCase()}.</Message>;
  }

  const series = toChartSeries(loaded.series, legend);
  const truncated =
    loaded.series.length > maxDrawnSeries ? (
      <Span $color="warning" $font={{ size: "xs" }}>
        Showing {maxDrawnSeries} of {loaded.series.length} series
      </Span>
    ) : null;

  if (chartType !== "line" && chartType !== "area") {
    const ValueChart = valueCharts[chartType];

    return (
      <Div $flex={{ direction: "vertical", gap: "xs" }} $height="full">
        <Div $flexChild $style={{ minHeight: 0 }}>
          <ValueChart clusterId={panelQuery.clusterId} series={series} unit={unit} max={max} step={step} />
        </Div>
        {truncated}
      </Div>
    );
  }

  return (
    <Div $flex={{ direction: "vertical", gap: "s" }} $height="full">
      <Div $flexChild $style={{ minHeight: 0 }}>
        <TimeSeriesChart
          clusterId={panelQuery.clusterId}
          chartKey={chartKey}
          series={series}
          start={loaded.start}
          end={loaded.end}
          step={step}
          unit={unit}
          stacked={chartType === "area"}
        />
      </Div>

      <Div
        $flex={{ direction: "horizontal", gap: { row: "xxs", column: "m" }, wrap: true }}
        $font={{ size: "xs" }}
        $overflow="auto"
        $style={{ maxHeight: "calc(var(--unit) * 11)", flex: "none" }}
      >
        {series.map((one) => (
          <Span key={one.key} $flex={{ direction: "horizontal", gap: "xs", verticalAlign: "center" }} $style={{ maxWidth: "100%" }}>
            <Span $style={{ background: one.color, width: 10, height: 3, borderRadius: 2, flex: "none" }} />
            <SeriesName
              clusterId={panelQuery.clusterId}
              links={one.links}
              $style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {one.name}
            </SeriesName>
            {one.last !== undefined && (
              <Span $color="textMuted" $style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatValue(unit, one.last)}
              </Span>
            )}
          </Span>
        ))}

        {truncated}
      </Div>
    </Div>
  );
});
