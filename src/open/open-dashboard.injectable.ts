import { clusterNameInjectionToken } from "@k8slens/cluster-contracts";
import { getInjectable2 } from "@k8slens/injectable";
import { mainViewTabHostKind } from "@k8slens/main-view-contracts";
import { applicationWindowOnly, openSubWindowInjectionToken } from "@k8slens/sub-window-contracts";
import { focusTabInjectionToken, openTabInjectionToken, tabIsOpenInjectionToken } from "@k8slens/tab-contracts";
import { dashboardInjectable } from "../dashboards/dashboards.injectable";
import { type DashboardAddress, dashboardViewId } from "./dashboard-address";
import { dashboardSubWindowKind, dashboardTabKind } from "./view-kinds";

/** Shows a dashboard of a cluster in a tab of the main view, or brings its tab to the front when it has one. */
export const openDashboardInTabInjectable = getInjectable2({
  id: "prom-king-open-dashboard-in-tab",
  tags: [applicationWindowOnly],
  consumptions: [openTabInjectionToken, focusTabInjectionToken, tabIsOpenInjectionToken],

  instantiate: (di) => {
    const openTab = di.inject(openTabInjectionToken.for(mainViewTabHostKind).for(dashboardTabKind).for(di.scopeIds))();
    const focusTab = di.inject(focusTabInjectionToken.for(mainViewTabHostKind).for(dashboardTabKind).for(di.scopeIds))();
    const isOpen = di.inject(tabIsOpenInjectionToken.for(mainViewTabHostKind).for(dashboardTabKind).for(di.scopeIds))();

    return () => async (address: DashboardAddress) => {
      const tabId = dashboardViewId(address);

      if (await isOpen({ tabId })) {
        await focusTab({ tabId });
      } else {
        await openTab({ tabId });
      }
    };
  },
});

/** Shows a dashboard of a cluster in a window of its own, or brings its window forward when it has one. */
export const openDashboardInWindowInjectable = getInjectable2({
  id: "prom-king-open-dashboard-in-window",
  consumptions: [openSubWindowInjectionToken, clusterNameInjectionToken],

  instantiate: (di) => {
    const openWindow = di.inject(openSubWindowInjectionToken.for(dashboardSubWindowKind).for(di.scopeIds))();
    const clusterName = di.inject(clusterNameInjectionToken);
    const dashboardOf = di.inject(dashboardInjectable);

    return () => async (address: DashboardAddress) => {
      const name = dashboardOf(address.dashboardId).get()?.name ?? "Dashboard";
      const cluster = await Promise.race([
        clusterName(address.clusterId),
        new Promise<string>((resolve) => setTimeout(() => resolve(address.clusterId), 1000)),
      ]);

      await openWindow({ id: dashboardViewId(address), params: { ...address, title: `${name} — ${cluster}` } });
    };
  },
});
