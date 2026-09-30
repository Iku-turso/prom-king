/** How a panel's values are written on its axis, in its legend and in its tooltip. */
export type PanelUnit =
  | "short"
  | "bytes"
  | "bytes-per-second"
  | "percent-ratio"
  | "percent"
  | "seconds"
  | "cores"
  | "per-second";

/**
 * How a panel draws its series. The first two draw them over time; the rest draw each series'
 * latest value, with the range only feeding the sparkline of a stat and the columns of a table.
 */
export type ChartType = "line" | "area" | "bar-gauge" | "stat" | "gauge" | "donut" | "table";

/** A share of the dashboard's twelve columns. */
export type PanelWidth = "quarter" | "third" | "half" | "full";

export type PanelHeight = "small" | "medium" | "large";

/** How far back a dashboard looks, in seconds. */
export type TimeRange = 300 | 900 | 3600 | 10800 | 21600 | 43200 | 86400 | 172800 | 604800;

/** How often a dashboard asks again, in seconds; 0 never does. */
export type RefreshInterval = 0 | 15 | 30 | 60 | 300;

/** One chart of a dashboard: a PromQL query and how to draw what it answers. */
export interface Panel {
  readonly id: string;
  readonly title: string;
  readonly query: string;
  readonly chartType: ChartType;
  readonly unit: PanelUnit;
  /** How a series is named in the legend, with `{{label}}` standing for a label's value. Empty names it by its labels. */
  readonly legend: string;
  readonly width: PanelWidth;
  readonly height: PanelHeight;
  /** The panel's own time range; left out, it follows the dashboard's. */
  readonly timeRange?: TimeRange;
  /** Where a gauge or a bar gauge is full; left out, the unit decides (100% for percentages) or the largest value does. */
  readonly max?: number;
}

export type PanelDraft = Omit<Panel, "id">;

/**
 * Which clusters show a dashboard. Mirrored to all, it is under every cluster, those added later
 * included; otherwise under the clusters named. Either way it is one dashboard: an edit made under
 * one cluster shows under all of them. A copy is a dashboard of its own.
 */
export type DashboardScope =
  | { readonly kind: "all" }
  | { readonly kind: "clusters"; readonly clusterIds: readonly string[] };

/** A set of panels the user put together, shown under the clusters its scope names. */
export interface Dashboard {
  readonly id: string;
  readonly name: string;
  readonly scope: DashboardScope;
  readonly timeRange: TimeRange;
  readonly refreshInterval: RefreshInterval;
  readonly panels: readonly Panel[];
}

export const timeRanges: readonly { readonly id: TimeRange; readonly label: string }[] = [
  { id: 300, label: "Last 5 minutes" },
  { id: 900, label: "Last 15 minutes" },
  { id: 3600, label: "Last hour" },
  { id: 10800, label: "Last 3 hours" },
  { id: 21600, label: "Last 6 hours" },
  { id: 43200, label: "Last 12 hours" },
  { id: 86400, label: "Last 24 hours" },
  { id: 172800, label: "Last 2 days" },
  { id: 604800, label: "Last 7 days" },
];

/** A short name for a range, for where there is little room: "1h", "7d". */
export const shortTimeRangeLabel = (timeRange: TimeRange) => {
  if (timeRange < 3600) return `${timeRange / 60}m`;
  if (timeRange < 86400) return `${timeRange / 3600}h`;

  return `${timeRange / 86400}d`;
};

export const refreshIntervals: readonly { readonly id: RefreshInterval; readonly label: string }[] = [
  { id: 0, label: "Off" },
  { id: 15, label: "15s" },
  { id: 30, label: "30s" },
  { id: 60, label: "1m" },
  { id: 300, label: "5m" },
];

export const chartTypes: readonly { readonly id: ChartType; readonly label: string }[] = [
  { id: "line", label: "Time series" },
  { id: "area", label: "Stacked area" },
  { id: "bar-gauge", label: "Bar gauge" },
  { id: "stat", label: "Stat" },
  { id: "gauge", label: "Gauge" },
  { id: "donut", label: "Donut" },
  { id: "table", label: "Table" },
];

export const panelUnits: readonly { readonly id: PanelUnit; readonly label: string }[] = [
  { id: "short", label: "Number" },
  { id: "bytes", label: "Bytes" },
  { id: "bytes-per-second", label: "Bytes per second" },
  { id: "percent-ratio", label: "Percent (0–1)" },
  { id: "percent", label: "Percent (0–100)" },
  { id: "seconds", label: "Seconds" },
  { id: "cores", label: "CPU cores" },
  { id: "per-second", label: "Per second" },
];

export const panelWidths: readonly { readonly id: PanelWidth; readonly label: string }[] = [
  { id: "quarter", label: "Quarter width" },
  { id: "third", label: "Third width" },
  { id: "half", label: "Half width" },
  { id: "full", label: "Full width" },
];

export const panelHeights: readonly { readonly id: PanelHeight; readonly label: string }[] = [
  { id: "small", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Tall" },
];

export const timeRangeLabel = (timeRange: TimeRange) =>
  timeRanges.find((range) => range.id === timeRange)?.label ?? `${timeRange}s`;

/** Roughly 120 points across the range, never finer than Prometheus's usual scrape interval. */
export const stepFor = (timeRange: TimeRange) => Math.max(15, Math.round(timeRange / 120));

/** The range a panel is drawn over: its own, or its dashboard's. */
export const panelTimeRange = (dashboard: Dashboard, panel: Panel) => panel.timeRange ?? dashboard.timeRange;

export const newId = () => crypto.randomUUID();

export const emptyPanelDraft: PanelDraft = {
  title: "",
  query: "",
  chartType: "line",
  unit: "short",
  legend: "",
  width: "half",
  height: "medium",
};

// What the first starter dashboards were made with: queries that miss every series on clusters
// whose cAdvisor reports pods but not their containers. Swapped for the working ones on read.
const brokenStarterQueries: Readonly<Record<string, string>> = {
  'sum by (namespace) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))':
    'sum by (namespace) (rate(container_cpu_usage_seconds_total{pod!="", container=""}[5m]))',
  'sum by (namespace) (container_memory_working_set_bytes{container!=""})':
    'sum by (namespace) (container_memory_working_set_bytes{pod!="", container=""})',
};

const knownWidths = new Set<string>(panelWidths.map((width) => width.id));

/** A panel as stored by any version of the extension, with what later versions added filled in. */
export const normalizePanel = (panel: Panel): Panel => ({
  ...panel,
  query: brokenStarterQueries[panel.query] ?? panel.query,
  chartType: panel.chartType ?? "line",
  height: panel.height ?? "medium",
  width: knownWidths.has(panel.width) ? panel.width : "half",
});

export const normalizeDashboard = (dashboard: Dashboard): Dashboard => ({
  ...dashboard,
  // Dashboards from before scopes were shown under every cluster, and still are.
  scope: dashboard.scope ?? { kind: "all" },
  panels: dashboard.panels.map(normalizePanel),
});

/** Whether more than one cluster shows the dashboard, so deleting it takes it from all of them. */
export const isMirrored = (scope: DashboardScope) => scope.kind === "all" || scope.clusterIds.length > 1;

export const isShownOn = (dashboard: Dashboard, clusterId: string) =>
  dashboard.scope.kind === "all" || dashboard.scope.clusterIds.includes(clusterId);

/** Where a dashboard shows, in a few words, for a tooltip or a heading. */
export const scopeLabel = (scope: DashboardScope) =>
  scope.kind === "all"
    ? "Mirrored to all clusters, current and future"
    : scope.clusterIds.length === 1
      ? "This cluster only"
      : `Mirrored to ${scope.clusterIds.length} clusters`;
