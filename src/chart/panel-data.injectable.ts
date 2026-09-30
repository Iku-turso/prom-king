import { getInjectable2 } from "@k8slens/injectable";
import { type PrometheusSeries, queryPrometheusRangeInjectionToken } from "@k8slens/prometheus-contracts";
import { observable, onBecomeObserved, onBecomeUnobserved, runInAction } from "mobx";
import { type RefreshInterval, stepFor, type TimeRange } from "../dashboards/dashboard";
import { ensureClusterConnectedInjectionToken } from "./ensure-cluster-connected.injectable";

export interface PanelQuery {
  readonly clusterId: string;
  readonly query: string;
  readonly timeRange: TimeRange;
  readonly refreshInterval: RefreshInterval;
}

/** What asking Prometheus came to. The last series stay on show while the next ask is under way. */
export type PanelData =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly previous?: LoadedSeries }
  | { readonly status: "loaded"; readonly loaded: LoadedSeries }
  | { readonly status: "error"; readonly reason: string };

export interface LoadedSeries {
  readonly series: readonly PrometheusSeries[];
  readonly start: number;
  readonly end: number;
}

/** A string, so that the same query of the same cluster over the same range is one instance, shared. */
export const panelQueryKey = (panelQuery: PanelQuery) =>
  JSON.stringify([panelQuery.clusterId, panelQuery.query, panelQuery.timeRange, panelQuery.refreshInterval]);

/** The series last loaded, whether or not another ask is under way. */
export const loadedOf = (data: PanelData) =>
  data.status === "loaded" ? data.loaded : data.status === "loading" ? data.previous : undefined;

const reasonOf =(error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The series of one query, asked while something shows them and not otherwise: the first render
 * that reads them starts the asking and the refresh interval, the last one to stop reading them
 * stops both. Connects the cluster first, since its Prometheus is reached through it.
 */
export const panelDataInjectable = getInjectable2({
  id: "prom-king-panel-data",
  consumptions: [queryPrometheusRangeInjectionToken, ensureClusterConnectedInjectionToken],

  instantiate: (di) => {
    const queryPrometheusRange = di.inject(queryPrometheusRangeInjectionToken)();
    const ensureClusterConnected = di.inject(ensureClusterConnectedInjectionToken)();

    return (key: string) => {
      const [clusterId, query, timeRange, refreshInterval] = JSON.parse(key) as [
        string,
        string,
        TimeRange,
        RefreshInterval,
      ];

      const state = observable.box<PanelData>({ status: "idle" }, { deep: false });
      let controller: AbortController | undefined;
      let timer: ReturnType<typeof setInterval> | undefined;

      const load = async () => {
        if (!query.trim()) {
          runInAction(() => state.set({ status: "error", reason: "The panel has no query yet." }));

          return;
        }

        controller?.abort();
        const current = new AbortController();
        controller = current;

        runInAction(() => state.set({ status: "loading", previous: loadedOf(state.get()) }));

        try {
          await ensureClusterConnected(clusterId);

          const end = Math.floor(Date.now() / 1000);
          const start = end - timeRange;
          const series = await queryPrometheusRange(clusterId, query, { start, end, step: stepFor(timeRange) }, current.signal);

          if (!current.signal.aborted) {
            runInAction(() => state.set({ status: "loaded", loaded: { series, start, end } }));
          }
        } catch (error) {
          if (!current.signal.aborted) {
            runInAction(() => state.set({ status: "error", reason: reasonOf(error) }));
          }
        }
      };

      onBecomeObserved(state, () => {
        void load();

        if (refreshInterval > 0) {
          timer = setInterval(() => void load(), refreshInterval * 1000);
        }
      });

      onBecomeUnobserved(state, () => {
        clearInterval(timer);
        timer = undefined;
        controller?.abort();
        controller = undefined;
      });

      return { state, refresh: load };
    };
  },
});
