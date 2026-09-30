import { getSubWindowKind } from "@k8slens/sub-window-contracts";
import { getTabKind } from "@k8slens/tab-contracts";
import type { DashboardAddress } from "./dashboard-address";

/** A dashboard of a cluster in a tab of the main view. The tab's id says which, so nothing else is kept. */
export const dashboardTabKind = getTabKind()("dashboard");

export interface DashboardWindowParams extends DashboardAddress {
  /** What the window's frame is titled with, as the dashboard was called when it was opened. */
  readonly title: string;
}

/** A dashboard of a cluster in a window of its own. */
export const dashboardSubWindowKind = getSubWindowKind<DashboardWindowParams>()("dashboard");
