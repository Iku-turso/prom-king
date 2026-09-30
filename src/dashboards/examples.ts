import { type Dashboard, newId, type Panel, type PanelDraft } from "./dashboard";

// Pod-level cgroup series: they carry the pod's labels and an empty `container`, on clusters whose
// cAdvisor also reports each container and on those that report pods alone. Summing them never
// counts a pod twice.
const podLevel = 'pod!="", container=""';

// Interfaces of the node itself rather than the virtual ones pods and CNIs add.
const physicalDevices = 'device!~"lo|veth.*|cni.*|flannel.*|docker.*|cali.*|cilium.*|lxc.*|tunl.*|vxlan.*|genev.*|kube-ipvs.*"';

// Filesystems that hold data, rather than the in-memory and overlay ones every node mounts many of.
const realFilesystems = 'fstype!~"tmpfs|overlay|squashfs|nsfs|ramfs|autofs|fuse.*"';

// A per-instance node-exporter query with the node's name (`nodename`) and its address without the
// port (`ip`) added, so a legend can say which node rather than only which address:port.
const withNodeNames = (query: string) =>
  `label_replace((${query}) * on (instance) group_left(nodename) node_uname_info, "ip", "$1", "instance", "(.+):[0-9]+")`;

const nodeLegend = "{{nodename}} ({{ip}})";

// The node examples as earlier versions wrote them, naming nodes by address alone.
const queriesWithoutNodeNames = new Set<string>();

const byNode = (query: string) => {
  queriesWithoutNodeNames.add(query);

  return withNodeNames(query);
};

/** A panel made from a node example of an earlier version, given the node's name in its legend. */
export const withNodeNamesIfFromExample = (panel: Panel): Panel =>
  queriesWithoutNodeNames.has(panel.query)
    ? { ...panel, query: withNodeNames(panel.query), legend: panel.legend.replaceAll("{{instance}}", nodeLegend) }
    : panel;

// Requests of pods that hold on to them: those still pending or running, not those long completed.
const activeRequests = (resource: "cpu" | "memory") =>
  `kube_pod_container_resource_requests{resource="${resource}"} * on (namespace, pod) group_left() max by (namespace, pod) (kube_pod_status_phase{phase=~"Pending|Running"} == 1)`;

export interface PanelExample extends PanelDraft {
  /** What the example shows, and what the cluster needs for it. */
  readonly description: string;
}

export interface ExampleCategory {
  readonly id: string;
  readonly label: string;
  readonly examples: readonly PanelExample[];
}

const panel = (example: Omit<PanelExample, "width" | "height"> & Partial<Pick<PanelExample, "width" | "height">>): PanelExample => ({
  width: "half",
  height: "medium",
  ...example,
});

const stat = (example: Omit<PanelExample, "width" | "height" | "legend"> & { legend?: string }): PanelExample => ({
  width: "quarter",
  height: "small",
  legend: "",
  ...example,
});

export const exampleCategories: readonly ExampleCategory[] = [
  {
    id: "cluster",
    label: "Cluster overview",
    examples: [
      stat({
        title: "Cluster CPU utilization",
        query: '1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))',
        chartType: "gauge",
        unit: "percent-ratio",
        legend: "CPU",
        description: "How busy the nodes' CPUs are, across the whole cluster. Needs node-exporter.",
      }),
      stat({
        title: "Cluster memory utilization",
        query: "1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)",
        chartType: "gauge",
        unit: "percent-ratio",
        legend: "Memory",
        description: "Share of the nodes' memory in use, across the whole cluster. Needs node-exporter.",
      }),
      stat({
        title: "CPU requests committed",
        query: `sum(${activeRequests("cpu")}) / sum(kube_node_status_allocatable{resource="cpu"})`,
        chartType: "gauge",
        unit: "percent-ratio",
        legend: "Requested",
        description: "Share of allocatable CPU that running and pending pods have requested: how much room the scheduler has left. Needs kube-state-metrics.",
      }),
      stat({
        title: "Memory requests committed",
        query: `sum(${activeRequests("memory")}) / sum(kube_node_status_allocatable{resource="memory"})`,
        chartType: "gauge",
        unit: "percent-ratio",
        legend: "Requested",
        description: "Share of allocatable memory that running and pending pods have requested. Needs kube-state-metrics.",
      }),
      stat({
        title: "Ready nodes",
        query: 'sum(kube_node_status_condition{condition="Ready", status="true"})',
        chartType: "stat",
        unit: "short",
        legend: "Ready",
        description: "Nodes reporting Ready. Needs kube-state-metrics.",
      }),
      stat({
        title: "Unschedulable nodes",
        query: "sum(kube_node_spec_unschedulable)",
        chartType: "stat",
        unit: "short",
        legend: "Cordoned",
        description: "Nodes cordoned so that nothing new is scheduled on them. Needs kube-state-metrics.",
      }),
      stat({
        title: "Running pods",
        query: 'sum(kube_pod_status_phase{phase="Running"})',
        chartType: "stat",
        unit: "short",
        legend: "Running",
        description: "Pods in the Running phase, cluster-wide. Needs kube-state-metrics.",
      }),
      stat({
        title: "Pods not ready",
        query: 'sum(kube_pod_status_ready{condition="false"})',
        chartType: "stat",
        unit: "short",
        legend: "Not ready",
        description: "Pods whose Ready condition is false: failing probes, crashing, or still starting. Needs kube-state-metrics.",
      }),
      panel({
        title: "Pods by phase",
        query: "sum by (phase) (kube_pod_status_phase)",
        chartType: "donut",
        unit: "short",
        legend: "{{phase}}",
        width: "third",
        description: "Every pod, by its phase: Running, Pending, Succeeded, Failed, Unknown. Needs kube-state-metrics.",
      }),
      panel({
        title: "Scrape targets up",
        query: "sum by (job) (up) / count by (job) (up)",
        chartType: "bar-gauge",
        unit: "percent-ratio",
        legend: "{{job}}",
        description: "Share of each scrape job's targets Prometheus can reach: whether the monitoring itself is healthy.",
      }),
    ],
  },
  {
    id: "nodes",
    label: "Nodes",
    examples: [
      panel({
        title: "CPU utilization by node",
        query: byNode(`1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))`),
        chartType: "line",
        unit: "percent-ratio",
        legend: nodeLegend,
        description: "How busy each node's CPUs are. Needs node-exporter.",
      }),
      panel({
        title: "Memory utilization by node",
        query: byNode(`1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes`),
        chartType: "line",
        unit: "percent-ratio",
        legend: nodeLegend,
        description: "Share of each node's memory in use, page cache that can be reclaimed not counted. Needs node-exporter.",
      }),
      panel({
        title: "Disk space used by node",
        query: byNode(`max by (instance) (1 - node_filesystem_avail_bytes{${realFilesystems}} / node_filesystem_size_bytes{${realFilesystems}})`),
        chartType: "bar-gauge",
        unit: "percent-ratio",
        legend: nodeLegend,
        description: "How full the fullest filesystem of each node is: what starts evicting pods when it runs out. Needs node-exporter.",
      }),
      panel({
        title: "Filesystems by usage",
        query: byNode(`1 - node_filesystem_avail_bytes{${realFilesystems}} / node_filesystem_size_bytes{${realFilesystems}}`),
        chartType: "table",
        unit: "percent-ratio",
        legend: `${nodeLegend} {{mountpoint}}`,
        description: "Every filesystem of every node, the fullest first. Needs node-exporter.",
      }),
      panel({
        title: "Load per CPU by node",
        query: byNode(`node_load5 / on (instance) count by (instance) (node_cpu_seconds_total{mode="idle"})`),
        chartType: "line",
        unit: "short",
        legend: nodeLegend,
        description: "Five-minute load average over the node's CPU count; above 1 means work is queueing. Needs node-exporter.",
      }),
      panel({
        title: "Disk I/O by node",
        query: byNode(`sum by (instance) (rate(node_disk_read_bytes_total[5m]) + rate(node_disk_written_bytes_total[5m]))`),
        chartType: "line",
        unit: "bytes-per-second",
        legend: nodeLegend,
        description: "Bytes each node reads from and writes to its disks each second. Needs node-exporter.",
      }),
      panel({
        title: "Running pods by node",
        query: "sum by (node) (kube_pod_info)",
        chartType: "bar-gauge",
        unit: "short",
        legend: "{{node}}",
        description: "How many pods each node carries, against the kubelet's default limit of 110. Needs kube-state-metrics.",
        max: 110,
      }),
    ],
  },
  {
    id: "namespaces",
    label: "Namespaces",
    examples: [
      panel({
        title: "CPU utilization by namespace",
        query: `sum by (namespace) (rate(container_cpu_usage_seconds_total{${podLevel}}[5m])) / scalar(sum(kube_node_status_allocatable{resource="cpu"}))`,
        chartType: "area",
        unit: "percent-ratio",
        legend: "{{namespace}}",
        description: "Share of the cluster's allocatable CPU each namespace uses, stacked to the cluster's total. Needs cAdvisor and kube-state-metrics.",
      }),
      panel({
        title: "Memory utilization by namespace",
        query: `sum by (namespace) (container_memory_working_set_bytes{${podLevel}}) / scalar(sum(kube_node_status_allocatable{resource="memory"}))`,
        chartType: "area",
        unit: "percent-ratio",
        legend: "{{namespace}}",
        description: "Share of the cluster's allocatable memory each namespace's working set takes. Needs cAdvisor and kube-state-metrics.",
      }),
      panel({
        title: "CPU usage against requests by namespace",
        query: `sum by (namespace) (rate(container_cpu_usage_seconds_total{${podLevel}}[5m])) / sum by (namespace) (kube_pod_container_resource_requests{resource="cpu"})`,
        chartType: "bar-gauge",
        unit: "percent-ratio",
        legend: "{{namespace}}",
        description: "How much of the CPU it requested each namespace uses: far below 100% is money left on the table, above it is borrowing. Needs cAdvisor and kube-state-metrics.",
      }),
      panel({
        title: "Memory usage against requests by namespace",
        query: `sum by (namespace) (container_memory_working_set_bytes{${podLevel}}) / sum by (namespace) (kube_pod_container_resource_requests{resource="memory"})`,
        chartType: "bar-gauge",
        unit: "percent-ratio",
        legend: "{{namespace}}",
        description: "How much of the memory it requested each namespace uses; above 100% risks eviction under pressure. Needs cAdvisor and kube-state-metrics.",
      }),
      panel({
        title: "Disk I/O by namespace",
        query: `sum by (namespace) (rate(container_fs_reads_bytes_total{${podLevel}}[5m]) + rate(container_fs_writes_bytes_total{${podLevel}}[5m]))`,
        chartType: "area",
        unit: "bytes-per-second",
        legend: "{{namespace}}",
        description: "Bytes read from and written to disk each second, per namespace. Needs cAdvisor.",
      }),
      panel({
        title: "Running pods by namespace",
        query: 'sum by (namespace) (kube_pod_status_phase{phase="Running"})',
        chartType: "bar-gauge",
        unit: "short",
        legend: "{{namespace}}",
        description: "How many pods run in each namespace. Needs kube-state-metrics.",
      }),
    ],
  },
  {
    id: "workloads",
    label: "Workloads",
    examples: [
      panel({
        title: "Top 10 pods by CPU",
        query: `topk(10, sum by (namespace, pod, node) (rate(container_cpu_usage_seconds_total{${podLevel}}[5m])))`,
        chartType: "bar-gauge",
        unit: "cores",
        legend: "{{namespace}}/{{pod}}",
        description: "The pods using the most CPU right now, in cores. Needs cAdvisor.",
      }),
      panel({
        title: "Top 10 pods by memory",
        query: `topk(10, sum by (namespace, pod, node) (container_memory_working_set_bytes{${podLevel}}))`,
        chartType: "bar-gauge",
        unit: "bytes",
        legend: "{{namespace}}/{{pod}}",
        description: "The pods with the largest working set right now. Needs cAdvisor.",
      }),
      panel({
        title: "Container restarts in the last hour",
        query: "sum by (namespace, pod) (increase(kube_pod_container_status_restarts_total[1h])) > 0",
        chartType: "table",
        unit: "short",
        legend: "{{namespace}}/{{pod}}",
        description: "Pods whose containers restarted in the last hour, the most restarts first: crash loops and OOM kills show up here. Needs kube-state-metrics.",
      }),
      panel({
        title: "Containers waiting",
        query: "sum by (reason) (kube_pod_container_status_waiting_reason)",
        chartType: "donut",
        unit: "short",
        legend: "{{reason}}",
        width: "third",
        description: "Containers that are not running, by why: CrashLoopBackOff, ImagePullBackOff, ContainerCreating. Needs kube-state-metrics.",
      }),
      panel({
        title: "Last terminated by OOM kill",
        query: 'max by (namespace, pod, container) (kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}) == 1',
        chartType: "table",
        unit: "short",
        legend: "{{namespace}}/{{pod}} {{container}}",
        description: "Containers whose last run ended in an out-of-memory kill: their memory limit is too low. Needs kube-state-metrics.",
      }),
      panel({
        title: "CPU throttling by pod",
        query:
          "topk(10, sum by (namespace, pod) (rate(container_cpu_cfs_throttled_periods_total[5m])) / sum by (namespace, pod) (rate(container_cpu_cfs_periods_total[5m])))",
        chartType: "bar-gauge",
        unit: "percent-ratio",
        legend: "{{namespace}}/{{pod}}",
        description: "Share of scheduling periods in which a pod hit its CPU limit and was held back: latency that shows up nowhere else. Needs cAdvisor.",
      }),
      panel({
        title: "Deployments with unavailable replicas",
        query: "kube_deployment_status_replicas_unavailable > 0",
        chartType: "table",
        unit: "short",
        legend: "{{namespace}}/{{deployment}}",
        description: "Deployments running short of the replicas they want. Needs kube-state-metrics.",
      }),
      panel({
        title: "StatefulSets not fully ready",
        query: "kube_statefulset_replicas - kube_statefulset_status_replicas_ready > 0",
        chartType: "table",
        unit: "short",
        legend: "{{namespace}}/{{statefulset}}",
        description: "StatefulSets with fewer ready replicas than they want. Needs kube-state-metrics.",
      }),
      panel({
        title: "Failed jobs",
        query: "kube_job_status_failed > 0",
        chartType: "table",
        unit: "short",
        legend: "{{namespace}}/{{job_name}}",
        description: "Jobs with failed pods. Needs kube-state-metrics.",
      }),
    ],
  },
  {
    id: "control-plane",
    label: "Control plane",
    examples: [
      panel({
        title: "API server requests by status code",
        query: "sum by (code) (rate(apiserver_request_total[5m]))",
        chartType: "area",
        unit: "per-second",
        legend: "{{code}}",
        description: "Requests the API server answers each second, by HTTP status.",
      }),
      stat({
        title: "API server error rate",
        query: 'sum(rate(apiserver_request_total{code=~"5.."}[5m]) or vector(0)) / sum(rate(apiserver_request_total[5m]))',
        chartType: "stat",
        unit: "percent-ratio",
        legend: "5xx",
        description: "Share of API server requests answered with a server error.",
      }),
      panel({
        title: "API server p99 latency by verb",
        query:
          'histogram_quantile(0.99, sum by (le, verb) (rate(apiserver_request_duration_seconds_bucket{verb!~"WATCH|CONNECT"}[5m])))',
        chartType: "line",
        unit: "seconds",
        legend: "{{verb}}",
        description: "How long the slowest 1% of API requests take, per verb; long-running watches left out.",
      }),
      panel({
        title: "Pending pods in the scheduler",
        query: "sum by (queue) (scheduler_pending_pods)",
        chartType: "line",
        unit: "short",
        legend: "{{queue}}",
        description: "Pods waiting to be scheduled; a growing unschedulable queue means the cluster is out of room. Needs the scheduler scraped.",
      }),
      panel({
        title: "Controller work queue depth",
        query: "topk(10, sum by (name) (workqueue_depth))",
        chartType: "line",
        unit: "short",
        legend: "{{name}}",
        description: "Items waiting in the controllers' work queues; a queue that keeps growing is a controller falling behind.",
      }),
      panel({
        title: "CoreDNS requests by type",
        query: "sum by (type) (rate(coredns_dns_requests_total[5m]))",
        chartType: "area",
        unit: "per-second",
        legend: "{{type}}",
        description: "DNS queries CoreDNS answers each second, by record type. Needs CoreDNS scraped.",
      }),
      panel({
        title: "CoreDNS p99 latency",
        query: "histogram_quantile(0.99, sum by (le) (rate(coredns_dns_request_duration_seconds_bucket[5m])))",
        chartType: "line",
        unit: "seconds",
        legend: "p99",
        description: "How long the slowest 1% of DNS queries take. Needs CoreDNS scraped.",
      }),
      panel({
        title: "etcd database size",
        query: "max by (instance) (etcd_mvcc_db_total_size_in_bytes)",
        chartType: "line",
        unit: "bytes",
        legend: "{{instance}}",
        description: "Size of etcd's database; it stops accepting writes at its quota, 2 GiB by default. Needs etcd scraped, which managed clusters do not allow.",
      }),
    ],
  },
  {
    id: "storage",
    label: "Storage",
    examples: [
      panel({
        title: "Persistent volume capacity by namespace",
        query: "sum by (namespace) (kube_persistentvolumeclaim_resource_requests_storage_bytes)",
        chartType: "bar-gauge",
        unit: "bytes",
        legend: "{{namespace}}",
        description: "Storage the persistent volume claims of each namespace request. Needs kube-state-metrics.",
      }),
      panel({
        title: "Persistent volume usage by namespace",
        query: "sum by (namespace) (kubelet_volume_stats_used_bytes) / sum by (namespace) (kubelet_volume_stats_capacity_bytes)",
        chartType: "bar-gauge",
        unit: "percent-ratio",
        legend: "{{namespace}}",
        description: "How full each namespace's persistent volumes are. Needs a storage driver that reports volume stats to the kubelet; local-path and hostPath do not.",
      }),
      panel({
        title: "Fullest persistent volumes",
        query: "topk(10, 1 - kubelet_volume_stats_available_bytes / kubelet_volume_stats_capacity_bytes)",
        chartType: "bar-gauge",
        unit: "percent-ratio",
        legend: "{{namespace}}/{{persistentvolumeclaim}}",
        description: "The ten fullest volumes, before one fills up and its pod stops writing. Needs volume stats from the storage driver.",
      }),
      panel({
        title: "Persistent volume claims by phase",
        query: "sum by (phase) (kube_persistentvolumeclaim_status_phase)",
        chartType: "donut",
        unit: "short",
        legend: "{{phase}}",
        width: "third",
        description: "Claims Bound, Pending or Lost; a Pending claim is a pod that cannot start. Needs kube-state-metrics.",
      }),
    ],
  },
  {
    id: "network",
    label: "Network",
    examples: [
      panel({
        title: "Network throughput by node",
        query: byNode(`sum by (instance) (rate(node_network_receive_bytes_total{${physicalDevices}}[5m]) + rate(node_network_transmit_bytes_total{${physicalDevices}}[5m]))`),
        chartType: "line",
        unit: "bytes-per-second",
        legend: nodeLegend,
        description: "Bytes each node sends and receives each second over its own interfaces. Needs node-exporter.",
      }),
      panel({
        title: "Network errors and drops by node",
        query: byNode(`sum by (instance) (rate(node_network_receive_errs_total{${physicalDevices}}[5m]) + rate(node_network_transmit_errs_total{${physicalDevices}}[5m]) + rate(node_network_receive_drop_total{${physicalDevices}}[5m]) + rate(node_network_transmit_drop_total{${physicalDevices}}[5m]))`),
        chartType: "line",
        unit: "per-second",
        legend: nodeLegend,
        description: "Packets each node's interfaces drop or get wrong each second; anything above zero is worth a look. Needs node-exporter.",
      }),
      panel({
        title: "Network receive by namespace",
        query: 'sum by (namespace) (rate(container_network_receive_bytes_total{namespace!=""}[5m]))',
        chartType: "area",
        unit: "bytes-per-second",
        legend: "{{namespace}}",
        description: "Bytes each namespace's pods receive each second. Needs cAdvisor network metrics, which some runtimes (such as k3s) leave out.",
      }),
      panel({
        title: "Network transmit by namespace",
        query: 'sum by (namespace) (rate(container_network_transmit_bytes_total{namespace!=""}[5m]))',
        chartType: "area",
        unit: "bytes-per-second",
        legend: "{{namespace}}",
        description: "Bytes each namespace's pods send each second. Needs cAdvisor network metrics, which some runtimes (such as k3s) leave out.",
      }),
    ],
  },
];

export const allExamples = exampleCategories.flatMap((category) => category.examples);

export const exampleNamed = (title: string): PanelDraft => {
  const { description: _description, ...draft } = allExamples.find((example) => example.title === title)!;

  return draft;
};

const starterPanels = [
  "Cluster CPU utilization",
  "Cluster memory utilization",
  "CPU requests committed",
  "Memory requests committed",
  "Ready nodes",
  "Running pods",
  "Pods not ready",
  "API server error rate",
  "CPU utilization by namespace",
  "Memory utilization by namespace",
  "Top 10 pods by CPU",
  "Top 10 pods by memory",
  "Container restarts in the last hour",
  "Disk space used by node",
];

/** A new dashboard: a cluster overview to start from, shown under the cluster it was created for. */
export const starterDashboard = (name: string, clusterId: string): Dashboard => ({
  id: newId(),
  name,
  scope: { kind: "clusters", clusterIds: [clusterId] },
  timeRange: 3600,
  refreshInterval: 30,
  panels: starterPanels.map((title) => ({ ...exampleNamed(title), id: newId() })),
});
