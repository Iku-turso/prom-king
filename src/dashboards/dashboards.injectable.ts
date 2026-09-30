import { getInjectable2 } from "@k8slens/injectable";
import { action, computed, type IComputedValue, type IObservableArray, observable, runInAction } from "mobx";
import { type Dashboard, normalizeDashboard } from "./dashboard";
import { dashboardsPersistableBunch } from "./dashboards-persistable.injectable";
import { withNodeNamesIfFromExample } from "./examples";

export interface Dashboards {
  /** Every dashboard, or undefined until they have loaded. */
  readonly all: IComputedValue<readonly Dashboard[] | undefined>;
  /** Adds the dashboard, or replaces the one with its id. */
  readonly save: (dashboard: Dashboard) => Promise<void>;
  readonly remove: (dashboardId: string) => Promise<void>;
}

/**
 * The dashboards, in whichever window asks. Lens keeps a persistable the same in every window
 * that holds it, so a dashboard window and the application window read and change the one list.
 */
export const dashboardsInjectable = getInjectable2({
  id: "prom-king-dashboards",

  instantiate: (di) => {
    const getPersisted = di.inject(dashboardsPersistableBunch.persistable);
    const persisted = observable.box<IObservableArray<Dashboard> | undefined>(undefined, { deep: false });

    void getPersisted().then((loaded) => runInAction(() => persisted.set(loaded)));

    const save = action((stored: IObservableArray<Dashboard>, dashboard: Dashboard) => {
      const index = stored.findIndex((candidate) => candidate.id === dashboard.id);

      if (index === -1) {
        stored.push(dashboard);
      } else {
        stored[index] = dashboard;
      }
    });

    const remove = action((stored: IObservableArray<Dashboard>, dashboardId: string) => {
      const dashboard = stored.find((candidate) => candidate.id === dashboardId);

      if (dashboard) {
        stored.remove(dashboard);
      }
    });

    const dashboards: Dashboards = {
      // Read through the migration, so a dashboard saved by an earlier version has what this one expects.
      all: computed(() =>
        persisted
          .get()
          ?.map(normalizeDashboard)
          .map((dashboard) => ({ ...dashboard, panels: dashboard.panels.map(withNodeNamesIfFromExample) })),
      ),
      save: async (dashboard) => save(await getPersisted(), dashboard),
      remove: async (dashboardId) => remove(await getPersisted(), dashboardId),
    };

    return () => dashboards;
  },
});

/** One dashboard by its id: undefined while loading, null once it is known to be gone. */
export const dashboardInjectable = getInjectable2({
  id: "prom-king-dashboard",

  instantiate: (di) => {
    const { all } = di.inject(dashboardsInjectable)();

    return (dashboardId: string) =>
      computed((): Dashboard | null | undefined => {
        const dashboards = all.get();

        return dashboards && (dashboards.find((dashboard) => dashboard.id === dashboardId) ?? null);
      });
  },
});
