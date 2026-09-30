import { clusterNavigatorItemKind } from "@k8slens/cluster-contracts";
import { AddIcon, DashboardIcon } from "@k8slens/icon";
import {
  NavigatorBranchIndicator,
  NavigatorDrillDownButton,
  NavigatorItemActions,
  NavigatorItemIcon,
  NavigatorItemLabel,
  NavigatorLeafIndicator,
} from "@k8slens/navigator-components";
import {
  getNavigatorItemKindInjectableBunch,
  type NavigatorItemProps,
  useItemDrillDown,
  useItemHasChildren,
  useItemIsOpen,
} from "@k8slens/navigator-contracts";
import { useInject } from "@k8slens/use-inject";
import { ToolButton } from "../view/tool-button";
import { computed } from "mobx";
import { createDashboardInjectable } from "./create-dashboard.injectable";
import { type DashboardsGroupItem, dashboardsGroupKind } from "./navigator-kinds";

// The same row under every cluster, there even with no dashboards, so there is always somewhere to create one.
const groupItems = computed((): DashboardsGroupItem[] => [{ id: "dashboards", name: "Custom metrics" }]);

const DashboardsGroupRow = ({ kind, ids, item }: NavigatorItemProps<DashboardsGroupItem, typeof clusterNavigatorItemKind>) => {
  const isOpen = useItemIsOpen(kind, ...ids);
  const hasChildren = useItemHasChildren(kind, ...ids);
  const drillDown = useItemDrillDown(kind, ...ids);
  const createDashboard = useInject(createDashboardInjectable)();
  const [clusterId] = ids;

  return (
    <>
      {hasChildren ? <NavigatorBranchIndicator isOpen={isOpen} /> : <NavigatorLeafIndicator />}

      <NavigatorItemIcon>
        <DashboardIcon />
      </NavigatorItemIcon>

      <NavigatorItemLabel>{item.name}</NavigatorItemLabel>

      <NavigatorItemActions>
        <ToolButton $tooltip="New dashboard" $onClick={() => void createDashboard(clusterId!)}>
          <AddIcon />
        </ToolButton>

        {hasChildren ? <NavigatorDrillDownButton $onClick={drillDown} $tooltip="Show the dashboards alone" /> : null}
      </NavigatorItemActions>
    </>
  );
};

export default getNavigatorItemKindInjectableBunch({
  kind: dashboardsGroupKind,
  parentKind: clusterNavigatorItemKind,
  description: "The custom Prometheus dashboards of a cluster, which each dashboard hangs under.",

  items: {
    instantiate: () => async () => groupItems,
  },

  Component: DashboardsGroupRow,
});
