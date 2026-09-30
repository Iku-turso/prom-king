# Prom King

Build your own Prometheus dashboards in Lens. A dashboard is a grid of panels, each a PromQL query drawn the way that suits it: a time series, a stacked area, bars, a big number, a gauge, a donut or a table. Dashboards live under clusters in the navigator and open in a tab or in a window of their own.

## Features

- **Dashboards in the navigator.** Every cluster has a **Custom metrics** entry listing the dashboards shown on it.
- **Mirror or copy between clusters.** Mirror a dashboard to chosen clusters, or to all of them (every current cluster and any added later): it stays one dashboard, so an edit shows everywhere. Or copy it to other clusters as independent dashboards to change separately.
- **Open in a tab or a new window.** Click a dashboard to open it in a tab. Use the window button next to it, or middle-click it, to open it in a separate window. Windows and tabs stay in sync.
- **Seven chart types.** Time series, stacked area, bar gauge, stat with sparkline, gauge, donut and table.
- **Per-panel time ranges.** Each panel follows the dashboard's time range, from 5 minutes to 7 days, or has its own. Pick it from the chip in the panel's corner.
- **Flexible layout.** Panels are a quarter, a third, half or the full width, and short, medium or tall.
- **46 ready-made panels.** Grouped into cluster overview, nodes, namespaces, workloads, control plane, storage and network, with the queries people reach for most: utilization and request commitment, top pods, restarts and OOM kills, CPU throttling, API server errors and latency, disk and volume space, and network throughput. Each example says which exporters it needs.
- **Live preview.** Run a query while you edit a panel to see it drawn before you save.
- **Hover readouts.** Point at a time series to read every series' value at that moment.
- **Click through to resources.** Click a series in a chart, a legend, a bar, a slice or a table row to open the details of the pod, node, deployment, StatefulSet, DaemonSet, job, volume or namespace it is about. When it names several, pick one from a menu. From a dashboard window, the details open in the main window.

## Usage

1. In the navigator, expand a cluster and find **Custom metrics**.
2. Click **+** on that row (or right-click it and choose **New dashboard**) and give the dashboard a name. It starts as a cluster overview and opens in a tab.
3. Click **Edit** to add panels, from scratch or from **Add example panel**, and to reorder, resize, duplicate or remove them. Click **Done** when finished.
4. Click the scope under the dashboard's name, or **Mirror**, to choose which clusters show it. **Copy** makes independent copies on other clusters.
5. Right-click a dashboard in the navigator to open it in a new tab or window, rename, duplicate, mirror, copy, remove it from one cluster, or delete it.

Queries go to the Prometheus configured for the cluster (see the cluster's settings in Lens). Opening a dashboard connects Lens to the cluster if it is not connected yet. When a query fails, the panel shows the reason Prometheus or Lens gave.

What changed in each version is in [CHANGELOG.md](./CHANGELOG.md).
