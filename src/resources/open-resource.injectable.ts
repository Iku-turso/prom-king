import { navigateToKubeResourceDetailsInjectionToken } from "@k8slens/details-panel-contracts";
import { getInjectable2, getInjectionToken2 } from "@k8slens/injectable";
import {
  appsV1,
  batchV1,
  coreV1,
  daemonSetKind,
  deploymentKind,
  jobKind,
  namespaceKind,
  nodeKind,
  persistentVolumeClaimKind,
  persistentVolumeKind,
  podKind,
  statefulSetKind,
} from "@k8slens/kubernetes-contracts";
import { getInstantInjectableBunch } from "@k8slens/instant";
import { isApplicationWindow, thisWindowIdInjectionToken } from "@k8slens/messaging-contracts";
import { isNavigationSupersededError } from "@k8slens/navigation-contracts";
import { showErrorNotificationInjectionToken, showInfoNotificationInjectionToken } from "@k8slens/notifications-contracts";
import { getPersistableValueInjectableBunch } from "@k8slens/persistable-contracts";
import { applicationWindowOnly, subWindowOnly } from "@k8slens/sub-window-contracts";
import { reaction, runInAction } from "mobx";
import { linkLabel, type ResourceLink } from "./resource-links";

/** Shows the details of a resource of a cluster. */
export type OpenResource = (clusterId: string, link: ResourceLink) => Promise<void>;

export const openResourceInjectionToken = getInjectionToken2<{ singleFactory: () => OpenResource }>({
  id: "prom-king-open-resource",
  cardinality: "one",
})();

const kindsOf = {
  pod: { kind: podKind, apiVersion: coreV1 },
  deployment: { kind: deploymentKind, apiVersion: appsV1 },
  statefulset: { kind: statefulSetKind, apiVersion: appsV1 },
  daemonset: { kind: daemonSetKind, apiVersion: appsV1 },
  job: { kind: jobKind, apiVersion: batchV1 },
  persistentvolumeclaim: { kind: persistentVolumeClaimKind, apiVersion: coreV1 },
  persistentvolume: { kind: persistentVolumeKind, apiVersion: coreV1 },
  node: { kind: nodeKind, apiVersion: coreV1 },
  namespace: { kind: namespaceKind, apiVersion: coreV1 },
} as const;

/**
 * What a dashboard window last asked the application window to show, since only it has the details
 * panel. A persistable, because Lens keeps one the same in every window: the dashboard window
 * writes it, the application window follows it.
 */
interface OpenResourceRequest {
  readonly requestId: string;
  readonly requestedAt: number;
  readonly clusterId: string;
  readonly link: ResourceLink;
}

export const openResourceRequestBunch = getPersistableValueInjectableBunch<OpenResourceRequest | null>()({
  id: "open-resource-request",
  defaultValue: { instantiate: () => async () => null },
});

// A request older than this was made before the application window could see it, and is left alone.
const requestLifetimeMs = 60_000;

/** In the application window: goes to the resource's details, saying so when the resource cannot be shown. */
export const openResourceInApplicationWindowInjectable = getInjectable2({
  id: "prom-king-open-resource-in-application-window",
  tags: [applicationWindowOnly],
  consumptions: [navigateToKubeResourceDetailsInjectionToken, showErrorNotificationInjectionToken],

  instantiate: (di) => {
    const navigateToKubeResourceDetails = di.inject(navigateToKubeResourceDetailsInjectionToken)();
    const showErrorNotification = di.inject(showErrorNotificationInjectionToken)();

    return (): OpenResource => async (clusterId, link) => {
      const { kind, apiVersion } = kindsOf[link.type];

      try {
        await navigateToKubeResourceDetails({
          clusterId,
          kind,
          apiVersion,
          ref: link.namespace ? { namespace: link.namespace, name: link.name } : { name: link.name },
        });
      } catch (error) {
        // The user went somewhere else before the details showed: not a failure.
        if (!isNavigationSupersededError(error)) {
          showErrorNotification(new Error(`Could not open ${linkLabel(link)}: ${(error as Error).message}`));
        }
      }
    };
  },

  injectionToken: openResourceInjectionToken,
});

/** In the application window: shows what a dashboard window asks to see, from the moment the extension is there. */
export const followOpenResourceRequestsBunch = getInstantInjectableBunch({
  id: "prom-king.follow-open-resource-requests",
  run: {
    consumptions: [thisWindowIdInjectionToken, openResourceInjectionToken],
    instantiate: (di) => () => async () => {
      if (!isApplicationWindow(di.inject(thisWindowIdInjectionToken)())) {
        return;
      }

      const openResource = di.inject(openResourceInjectionToken)();
      const request = await di.inject(openResourceRequestBunch.persistable)();
      let handled = request.get()?.requestId;

      reaction(
        () => request.get(),
        (latest) => {
          if (!latest || latest.requestId === handled || Date.now() - latest.requestedAt > requestLifetimeMs) {
            return;
          }

          handled = latest.requestId;
          void openResource(latest.clusterId, latest.link);
        },
      );
    },
  },
});

/** In a dashboard window: hands the resource to the application window, which shows its details. */
export const openResourceInSubWindowInjectable = getInjectable2({
  id: "prom-king-open-resource-in-sub-window",
  tags: [subWindowOnly],
  consumptions: [showInfoNotificationInjectionToken],

  instantiate: (di) => {
    const getRequest = di.inject(openResourceRequestBunch.persistable);
    const showInfoNotification = di.inject(showInfoNotificationInjectionToken)();

    return (): OpenResource => async (clusterId, link) => {
      const request = await getRequest();

      runInAction(() => request.set({ requestId: crypto.randomUUID(), requestedAt: Date.now(), clusterId, link }));
      showInfoNotification(`${linkLabel(link)} is shown in the main window.`);
    };
  },

  injectionToken: openResourceInjectionToken,
});
