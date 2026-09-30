/** Which dashboard, shown for which cluster: what a tab or a window of a dashboard is about. */
export interface DashboardAddress {
  readonly clusterId: string;
  readonly dashboardId: string;
}

/** The one id a tab and a window of the same dashboard of the same cluster are found again by. */
export const dashboardViewId = ({ clusterId, dashboardId }: DashboardAddress) => JSON.stringify([clusterId, dashboardId]);

export const parseDashboardViewId = (viewId: string): DashboardAddress => {
  const [clusterId, dashboardId] = JSON.parse(viewId) as [string, string];

  return { clusterId, dashboardId };
};
