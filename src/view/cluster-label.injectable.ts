import { clusterNameReactiveInjectionToken } from "@k8slens/cluster-contracts";
import { getInjectable2 } from "@k8slens/injectable";
import { computed, type IComputedValue, observable, runInAction } from "mobx";

/** What the user calls a cluster, following renames; its id until Lens has said. */
export const clusterLabelInjectable = getInjectable2({
  id: "prom-king-cluster-label",
  consumptions: [clusterNameReactiveInjectionToken],

  instantiate: (di) => {
    const clusterNameReactive = di.inject(clusterNameReactiveInjectionToken);

    return (clusterId: string) => {
      const name = observable.box<IComputedValue<string> | undefined>(undefined, { deep: false });

      void clusterNameReactive(clusterId).then((reactive) => runInAction(() => name.set(reactive)));

      return computed(() => name.get()?.get() ?? clusterId);
    };
  },
});
