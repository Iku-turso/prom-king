import { getNavigatorItemKind } from "@k8slens/navigator-contracts";

/** The one row under a cluster that its dashboards hang under. */
export interface DashboardsGroupItem {
  readonly id: string;
  readonly name: string;
}

/** A dashboard as the navigator lists it under a cluster. */
export interface DashboardItem {
  readonly id: string;
  readonly name: string;
  readonly panelCount: number;
  /** Whether other clusters show this very dashboard too. */
  readonly mirrored: boolean;
  readonly scopeLabel: string;
}

// Under a cluster, so the group's parent ancestry is the cluster's id, and a dashboard's is the
// cluster's id and then the group's: which cluster a dashboard is opened for is always in the path.
export const dashboardsGroupKind = getNavigatorItemKind<DashboardsGroupItem, [clusterId: string]>()("dashboards");
export const dashboardKind = getNavigatorItemKind<DashboardItem, [clusterId: string, groupId: string]>()("dashboard");
