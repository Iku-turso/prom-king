import { allClusterRecordsInjectionToken } from "@k8slens/cluster-contracts";
import { getInjectable2 } from "@k8slens/injectable";
import { openModalInjectionToken } from "@k8slens/modal-contracts";
import { action, observable } from "mobx";
import { clusterPickerModalKind, type PickableCluster } from "../modals/cluster-picker-modal.injectable";
import { confirmModalKind } from "../modals/confirm-modal.injectable";
import { nameDashboardModalKind } from "../modals/name-dashboard-modal.injectable";
import { panelEditorModalKind } from "../modals/panel-editor-modal.injectable";
import {
  type Dashboard,
  emptyPanelDraft,
  isMirrored,
  newId,
  type Panel,
  type PanelDraft,
  type PanelWidth,
  type RefreshInterval,
  type TimeRange,
} from "./dashboard";
import { dashboardInjectable, dashboardsInjectable } from "./dashboards.injectable";
import { starterDashboard } from "./examples";

/**
 * Everything the user can do to a dashboard, asking them what it needs to know first. Works in the
 * application window and in a dashboard window alike.
 */
export const dashboardActionsInjectable = getInjectable2({
  id: "prom-king-dashboard-actions",
  consumptions: [openModalInjectionToken, allClusterRecordsInjectionToken],

  instantiate: (di) => {
    const dashboards = di.inject(dashboardsInjectable)();
    const dashboardOf = di.inject(dashboardInjectable);
    const allClusterRecords = di.inject(allClusterRecordsInjectionToken);
    const askName = di.inject(openModalInjectionToken.for(nameDashboardModalKind).for(di.scopeIds))();
    const confirm = di.inject(openModalInjectionToken.for(confirmModalKind).for(di.scopeIds))();
    const editPanelIn = di.inject(openModalInjectionToken.for(panelEditorModalKind).for(di.scopeIds))();
    const pickClusters = di.inject(openModalInjectionToken.for(clusterPickerModalKind).for(di.scopeIds))();

    const current = (dashboardId: string) => dashboardOf(dashboardId).get() ?? undefined;

    const clusters = async (): Promise<PickableCluster[]> =>
      (await allClusterRecords())
        .map((record) => ({ id: record.id, name: record.name.get() }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const update = async (dashboardId: string, change: (dashboard: Dashboard) => Dashboard) => {
      const dashboard = current(dashboardId);

      if (dashboard) {
        await dashboards.save(change(dashboard));
      }
    };

    const updatePanels = (dashboardId: string, change: (panels: readonly Panel[]) => readonly Panel[]) =>
      update(dashboardId, (dashboard) => ({ ...dashboard, panels: change(dashboard.panels) }));

    const updatePanel = (dashboardId: string, panelId: string, change: (panel: Panel) => Panel) =>
      updatePanels(dashboardId, (panels) => panels.map((panel) => (panel.id === panelId ? change(panel) : panel)));

    const copyOf = (dashboard: Dashboard, clusterId: string, name: string): Dashboard => ({
      ...dashboard,
      id: newId(),
      name,
      scope: { kind: "clusters", clusterIds: [clusterId] },
      panels: dashboard.panels.map((panel) => ({ ...panel, id: newId() })),
    });

    const actions = {
      /** Asks for a name and creates a cluster overview under the cluster it was asked from. */
      create: async (clusterId: string): Promise<Dashboard | undefined> => {
        const name = await askName("New dashboard", "Create", "");

        if (!name) {
          return undefined;
        }

        const dashboard = starterDashboard(name, clusterId);

        await dashboards.save(dashboard);

        return dashboard;
      },

      rename: async (dashboardId: string) => {
        const dashboard = current(dashboardId);
        const name = dashboard && (await askName("Rename dashboard", "Rename", dashboard.name));

        if (name) {
          await update(dashboardId, (latest) => ({ ...latest, name }));
        }
      },

      /** A copy of its own under the same cluster, to change without changing the original. */
      duplicate: async (dashboardId: string, clusterId: string): Promise<Dashboard | undefined> => {
        const dashboard = current(dashboardId);

        if (!dashboard) {
          return undefined;
        }

        const copy = copyOf(dashboard, clusterId, `${dashboard.name} (copy)`);

        await dashboards.save(copy);

        return copy;
      },

      /** Chooses which clusters show this very dashboard: some, or all of them, those added later included. */
      mirror: async (dashboardId: string, clusterId: string) => {
        const dashboard = current(dashboardId);

        if (!dashboard) {
          return;
        }

        const selection = await pickClusters({
          heading: `Mirror ${dashboard.name}`,
          explanation:
            "A mirrored dashboard is one dashboard shown under several clusters: a change made under one shows under all of them.",
          confirmLabel: "Mirror",
          clusters: await clusters(),
          allowAll: true,
          initial:
            dashboard.scope.kind === "all"
              ? { all: true, clusterIds: [] }
              : { all: false, clusterIds: dashboard.scope.clusterIds },
          required: clusterId,
        });

        if (selection) {
          await update(dashboardId, (latest) => ({
            ...latest,
            scope: selection.all ? { kind: "all" } : { kind: "clusters", clusterIds: selection.clusterIds },
          }));
        }
      },

      /** Makes a copy of its own under each cluster chosen, to change there without changing this one. */
      copyTo: async (dashboardId: string, clusterId: string) => {
        const dashboard = current(dashboardId);

        if (!dashboard) {
          return;
        }

        const selection = await pickClusters({
          heading: `Copy ${dashboard.name}`,
          explanation:
            "Each cluster chosen gets a copy of its own, which can be changed there without changing this one or the others.",
          confirmLabel: "Copy",
          clusters: (await clusters()).filter((cluster) => cluster.id !== clusterId),
          allowAll: false,
          initial: { all: false, clusterIds: [] },
        });

        for (const targetId of selection?.clusterIds ?? []) {
          await dashboards.save(copyOf(dashboard, targetId, dashboard.name));
        }
      },

      /** Takes a mirrored dashboard away from one cluster, leaving it under the others. */
      removeFromCluster: async (dashboardId: string, clusterId: string, clusterName: string) => {
        const dashboard = current(dashboardId);

        if (!dashboard) {
          return;
        }

        const remaining =
          dashboard.scope.kind === "all"
            ? (await clusters()).map((cluster) => cluster.id).filter((id) => id !== clusterId)
            : dashboard.scope.clusterIds.filter((id) => id !== clusterId);

        const explanation =
          dashboard.scope.kind === "all"
            ? `The dashboard stays under every other cluster Lens knows now, but clusters added later will no longer get it.`
            : "The dashboard stays under the other clusters it is mirrored to.";

        if (await confirm(`Remove ${dashboard.name} from ${clusterName}?`, explanation, "Remove")) {
          await update(dashboardId, (latest) => ({ ...latest, scope: { kind: "clusters", clusterIds: remaining } }));
        }
      },

      remove: async (dashboardId: string) => {
        const dashboard = current(dashboardId);
        const everywhere = dashboard !== undefined && isMirrored(dashboard.scope);

        if (
          dashboard &&
          (await confirm(
            everywhere ? `Delete ${dashboard.name} from all clusters?` : `Delete ${dashboard.name}?`,
            everywhere
              ? "The dashboard is mirrored, so it is deleted under every cluster that shows it. Copies made of it are kept. This cannot be undone."
              : "The dashboard and its panels are deleted. This cannot be undone.",
            everywhere ? "Delete from all clusters" : "Delete",
          ))
        ) {
          await dashboards.remove(dashboardId);
        }
      },

      setTimeRange: (dashboardId: string, timeRange: TimeRange) =>
        update(dashboardId, (dashboard) => ({ ...dashboard, timeRange })),

      setRefreshInterval: (dashboardId: string, refreshInterval: RefreshInterval) =>
        update(dashboardId, (dashboard) => ({ ...dashboard, refreshInterval })),

      /** Opens the editor on a new panel, from scratch or from an example, and adds it when saved. */
      addPanel: async (clusterId: string, dashboardId: string, from: PanelDraft = emptyPanelDraft) => {
        const dashboard = current(dashboardId);
        const draft = dashboard && (await editPanelIn("Add panel", clusterId, dashboard.timeRange, from));

        if (draft) {
          await updatePanels(dashboardId, (panels) => [...panels, { ...draft, id: newId() }]);
        }
      },

      /** Adds an example as it is, without asking. */
      addExamplePanel: (dashboardId: string, example: PanelDraft) =>
        updatePanels(dashboardId, (panels) => [...panels, { ...example, id: newId() }]),

      editPanel: async (clusterId: string, dashboardId: string, panelId: string) => {
        const dashboard = current(dashboardId);
        const panel = dashboard?.panels.find((candidate) => candidate.id === panelId);

        if (!dashboard || !panel) {
          return;
        }

        const { id, ...initial } = panel;
        const draft = await editPanelIn("Edit panel", clusterId, dashboard.timeRange, initial);

        if (draft) {
          await updatePanel(dashboardId, id, () => ({ ...draft, id }));
        }
      },

      /** Gives a panel a time range of its own, or back to the dashboard's with undefined. */
      setPanelTimeRange: (dashboardId: string, panelId: string, timeRange: TimeRange | undefined) =>
        updatePanel(dashboardId, panelId, ({ timeRange: _previous, ...panel }) =>
          timeRange === undefined ? panel : { ...panel, timeRange },
        ),

      setPanelWidth: (dashboardId: string, panelId: string, width: PanelWidth) =>
        updatePanel(dashboardId, panelId, (panel) => ({ ...panel, width })),

      duplicatePanel: (dashboardId: string, panelId: string) =>
        updatePanels(dashboardId, (panels) =>
          panels.flatMap((panel) =>
            panel.id === panelId ? [panel, { ...panel, id: newId(), title: `${panel.title} (copy)` }] : [panel],
          ),
        ),

      removePanel: async (dashboardId: string, panelId: string) => {
        const panel = current(dashboardId)?.panels.find((candidate) => candidate.id === panelId);

        if (panel && (await confirm(`Remove ${panel.title}?`, "The panel is removed from the dashboard.", "Remove"))) {
          await updatePanels(dashboardId, (panels) => panels.filter((candidate) => candidate.id !== panelId));
        }
      },

      /** Moves a panel one place earlier or later. */
      movePanel: (dashboardId: string, panelId: string, by: -1 | 1) =>
        updatePanels(dashboardId, (panels) => {
          const from = panels.findIndex((panel) => panel.id === panelId);
          const to = from + by;

          if (from === -1 || to < 0 || to >= panels.length) {
            return panels;
          }

          const reordered = [...panels];

          [reordered[from], reordered[to]] = [reordered[to]!, reordered[from]!];

          return reordered;
        }),
    };

    return () => actions;
  },
});

/** Whether a view of a dashboard is being edited; one per view, so a tab and a window of it edit apart. */
export const dashboardEditingInjectable = getInjectable2({
  id: "prom-king-dashboard-editing",

  instantiate: () => (_viewKey: string) => {
    const editing = observable.box(false);

    return {
      editing,
      toggle: action(() => editing.set(!editing.get())),
    };
  },
});
