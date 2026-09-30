/** A Kubernetes resource a series names in its labels, as far as is needed to open its details. */
export interface ResourceLink {
  readonly type: ResourceType;
  readonly name: string;
  readonly namespace?: string;
}

export type ResourceType =
  | "pod"
  | "deployment"
  | "statefulset"
  | "daemonset"
  | "job"
  | "persistentvolumeclaim"
  | "persistentvolume"
  | "node"
  | "namespace";

export const resourceTypeLabels: Record<ResourceType, string> = {
  pod: "Pod",
  deployment: "Deployment",
  statefulset: "StatefulSet",
  daemonset: "DaemonSet",
  job: "Job",
  persistentvolumeclaim: "Persistent volume claim",
  persistentvolume: "Persistent volume",
  node: "Node",
  namespace: "Namespace",
};

// Namespaced resources, by the label that names them, most specific first.
const namespacedLabels: readonly [label: string, type: ResourceType][] = [
  ["pod", "pod"],
  ["deployment", "deployment"],
  ["statefulset", "statefulset"],
  ["daemonset", "daemonset"],
  ["job_name", "job"],
  ["persistentvolumeclaim", "persistentvolumeclaim"],
];

/**
 * A raw series scraped through a ServiceMonitor carries the scraped pod's own `pod`, `namespace`
 * and `service`: the exporter's, not the thing measured. Such a pod is named after its service,
 * which is how it is told apart from a pod the series is about.
 */
const isExporterPod = (metric: Readonly<Record<string, string>>) =>
  metric.pod !== undefined && metric.service !== undefined && metric.pod.startsWith(metric.service);

export const linkKey = (link: ResourceLink) => `${link.type}:${link.namespace ?? ""}/${link.name}`;

export const linkLabel = (link: ResourceLink) =>
  `${resourceTypeLabels[link.type]} ${link.namespace ? `${link.namespace}/` : ""}${link.name}`;

/** Every resource a series names, the most specific first: a pod before its node, a node before a namespace. */
export const resourceLinksOf = (metric: Readonly<Record<string, string>>): ResourceLink[] => {
  const links: ResourceLink[] = [];
  const exporterPod = isExporterPod(metric);
  const namespace = metric.namespace;

  if (namespace) {
    for (const [label, type] of namespacedLabels) {
      const name = metric[label];

      if (name && !(label === "pod" && exporterPod)) {
        links.push({ type, name, namespace });
      }
    }
  }

  if (metric.persistentvolume) {
    links.push({ type: "persistentvolume", name: metric.persistentvolume });
  }

  const node = metric.node ?? metric.nodename;

  if (node) {
    links.push({ type: "node", name: node });
  }

  // The exporter's namespace says nothing about what is measured, unless something namespaced is named too.
  const namespaceIsExporters = exporterPod && !links.some((link) => link.namespace !== undefined);

  if (namespace && !namespaceIsExporters) {
    links.push({ type: "namespace", name: namespace });
  }

  return links;
};
