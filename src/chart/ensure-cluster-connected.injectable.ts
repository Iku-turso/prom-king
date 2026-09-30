import { clusterIsConnectedInjectionToken, connectClusterInjectionToken } from "@k8slens/cluster-contracts";
import { getInjectable2, getInjectionToken2 } from "@k8slens/injectable";
import { applicationWindowOnly, subWindowOnly } from "@k8slens/sub-window-contracts";

/** Resolves once the cluster can be asked, or rejects saying why it cannot. */
export type EnsureClusterConnected = (clusterId: string) => Promise<void>;

export const ensureClusterConnectedInjectionToken = getInjectionToken2<{ singleFactory: () => EnsureClusterConnected }>({
  id: "prom-king-ensure-cluster-connected",
  cardinality: "one",
})();

/** The application window connects a cluster that is not connected yet. */
export const ensureClusterConnectedInApplicationWindowInjectable = getInjectable2({
  id: "prom-king-ensure-cluster-connected-in-application-window",
  tags: [applicationWindowOnly],
  consumptions: [connectClusterInjectionToken],

  instantiate: (di) => {
    const connectCluster = di.inject(connectClusterInjectionToken);

    return () => async (clusterId: string) => {
      await connectCluster(clusterId);
    };
  },

  injectionToken: ensureClusterConnectedInjectionToken,
});

/**
 * A dashboard window can only ask whether the cluster is connected: connecting one is not
 * available in a sub-window, so it tells the user where to do it.
 */
export const ensureClusterConnectedInSubWindowInjectable = getInjectable2({
  id: "prom-king-ensure-cluster-connected-in-sub-window",
  tags: [subWindowOnly],
  consumptions: [clusterIsConnectedInjectionToken],

  instantiate: (di) => {
    const clusterIsConnected = di.inject(clusterIsConnectedInjectionToken);

    return () => async (clusterId: string) => {
      if (!(await clusterIsConnected(clusterId))) {
        throw new Error("Lens is not connected to this cluster. Connect to it from the main window, then press Refresh here.");
      }
    };
  },

  injectionToken: ensureClusterConnectedInjectionToken,
});
