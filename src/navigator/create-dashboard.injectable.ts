import { getInjectable2 } from "@k8slens/injectable";
import { applicationWindowOnly } from "@k8slens/sub-window-contracts";
import { dashboardActionsInjectable } from "../dashboards/dashboard-actions.injectable";
import { openDashboardInTabInjectable } from "../open/open-dashboard.injectable";

/** Asks for a new dashboard and shows it, for the cluster it was asked from, in a tab. */
export const createDashboardInjectable = getInjectable2({
  id: "prom-king-create-dashboard",
  tags: [applicationWindowOnly],

  instantiate: (di) => {
    const actions = di.inject(dashboardActionsInjectable)();
    const openInTab = di.inject(openDashboardInTabInjectable)();

    return () => async (clusterId: string) => {
      const dashboard = await actions.create(clusterId);

      if (dashboard) {
        await openInTab({ clusterId, dashboardId: dashboard.id });
      }
    };
  },
});

/** Copies a dashboard and shows the copy, for the cluster it was asked from, in a tab. */
export const duplicateDashboardInjectable = getInjectable2({
  id: "prom-king-duplicate-dashboard",
  tags: [applicationWindowOnly],

  instantiate: (di) => {
    const actions = di.inject(dashboardActionsInjectable)();
    const openInTab = di.inject(openDashboardInTabInjectable)();

    return () => async (clusterId: string, dashboardId: string) => {
      const copy = await actions.duplicate(dashboardId, clusterId);

      if (copy) {
        await openInTab({ clusterId, dashboardId: copy.id });
      }
    };
  },
});
