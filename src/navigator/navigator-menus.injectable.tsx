import { DropDownMenuItemRow } from "@k8slens/drop-down-menu-items";
import {
  AddIcon,
  ContentCopyIcon,
  DashboardIcon,
  DeleteOutlineIcon,
  EditIcon,
  LayersIcon,
  LinkOffIcon,
  OpenInBrowserIcon,
  ShareIcon,
} from "@k8slens/icon";
import {
  getNavigatorItemMenuItemInjectableBunch,
  type NavigatorItemOfKind,
  navigatorItemDropDownMenuOrderNumbers,
  useItem,
} from "@k8slens/navigator-contracts";
import { useInject } from "@k8slens/use-inject";
import { observer } from "mobx-react";
import { dashboardActionsInjectable } from "../dashboards/dashboard-actions.injectable";
import { clusterLabelInjectable } from "../view/cluster-label.injectable";
import { openDashboardInTabInjectable, openDashboardInWindowInjectable } from "../open/open-dashboard.injectable";
import { createDashboardInjectable, duplicateDashboardInjectable } from "./create-dashboard.injectable";
import { dashboardKind, dashboardsGroupKind } from "./navigator-kinds";

const { item: itemOrder, removal: removalOrder } = navigatorItemDropDownMenuOrderNumbers;

type GroupData = { data: NavigatorItemOfKind<typeof dashboardsGroupKind> };
type DashboardData = { data: NavigatorItemOfKind<typeof dashboardKind> };

// The ancestry of a dashboard is the cluster, the group and then the dashboard itself.
const addressOf = ({ ids: [clusterId, , dashboardId] }: DashboardData["data"]) => ({
  clusterId: clusterId!,
  dashboardId: dashboardId!,
});

const NewDashboard = ({ data }: GroupData) => {
  const createDashboard = useInject(createDashboardInjectable)();

  return (
    <DropDownMenuItemRow Icon={AddIcon} $onClick={() => void createDashboard(data.ids[0]!)}>
      New dashboard
    </DropDownMenuItemRow>
  );
};

export const newDashboardMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-new-dashboard-menu-item",
  forItemsOfKind: dashboardsGroupKind,
  orderNumber: itemOrder,
  Component: NewDashboard,
});

const OpenInTab = ({ data }: DashboardData) => {
  const openInTab = useInject(openDashboardInTabInjectable)();

  return (
    <DropDownMenuItemRow Icon={DashboardIcon} $onClick={() => void openInTab(addressOf(data))}>
      Open in new tab
    </DropDownMenuItemRow>
  );
};

export const openInTabMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-open-dashboard-in-tab-menu-item",
  forItemsOfKind: dashboardKind,
  orderNumber: itemOrder,
  Component: OpenInTab,
});

const OpenInWindow = ({ data }: DashboardData) => {
  const openInWindow = useInject(openDashboardInWindowInjectable)();

  return (
    <DropDownMenuItemRow Icon={OpenInBrowserIcon} $onClick={() => void openInWindow(addressOf(data))}>
      Open in new window
    </DropDownMenuItemRow>
  );
};

export const openInWindowMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-open-dashboard-in-window-menu-item",
  forItemsOfKind: dashboardKind,
  orderNumber: itemOrder + 0.1,
  Component: OpenInWindow,
});

const Rename = ({ data }: DashboardData) => {
  const actions = useInject(dashboardActionsInjectable)();

  return (
    <DropDownMenuItemRow Icon={EditIcon} $onClick={() => void actions.rename(addressOf(data).dashboardId)}>
      Rename
    </DropDownMenuItemRow>
  );
};

export const renameMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-rename-dashboard-menu-item",
  forItemsOfKind: dashboardKind,
  orderNumber: itemOrder + 0.2,
  Component: Rename,
});

const Duplicate = ({ data }: DashboardData) => {
  const duplicate = useInject(duplicateDashboardInjectable)();
  const { clusterId, dashboardId } = addressOf(data);

  return (
    <DropDownMenuItemRow Icon={ContentCopyIcon} $onClick={() => void duplicate(clusterId, dashboardId)}>
      Duplicate
    </DropDownMenuItemRow>
  );
};

export const duplicateMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-duplicate-dashboard-menu-item",
  forItemsOfKind: dashboardKind,
  orderNumber: itemOrder + 0.3,
  Component: Duplicate,
});

const Mirror = ({ data }: DashboardData) => {
  const actions = useInject(dashboardActionsInjectable)();
  const { clusterId, dashboardId } = addressOf(data);

  return (
    <DropDownMenuItemRow Icon={ShareIcon} $onClick={() => void actions.mirror(dashboardId, clusterId)}>
      Mirror to clusters…
    </DropDownMenuItemRow>
  );
};

export const mirrorMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-mirror-dashboard-menu-item",
  forItemsOfKind: dashboardKind,
  orderNumber: itemOrder + 0.4,
  Component: Mirror,
});

const CopyTo = ({ data }: DashboardData) => {
  const actions = useInject(dashboardActionsInjectable)();
  const { clusterId, dashboardId } = addressOf(data);

  return (
    <DropDownMenuItemRow Icon={LayersIcon} $onClick={() => void actions.copyTo(dashboardId, clusterId)}>
      Copy to clusters…
    </DropDownMenuItemRow>
  );
};

export const copyToMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-copy-dashboard-to-menu-item",
  forItemsOfKind: dashboardKind,
  orderNumber: itemOrder + 0.5,
  Component: CopyTo,
});

// Offered only for a mirrored dashboard: taking the one cluster of an unmirrored one away is deleting it.
const RemoveFromCluster = observer(({ data }: DashboardData) => {
  const actions = useInject(dashboardActionsInjectable)();
  const item = useItem(data.kind, ...data.ids);
  const { clusterId, dashboardId } = addressOf(data);
  const clusterName = useInject(clusterLabelInjectable)(clusterId).get();

  if (!item?.mirrored) {
    return null;
  }

  return (
    <DropDownMenuItemRow
      Icon={LinkOffIcon}
      $onClick={() => void actions.removeFromCluster(dashboardId, clusterId, clusterName)}
    >
      Remove from this cluster
    </DropDownMenuItemRow>
  );
});

export const removeFromClusterMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-remove-dashboard-from-cluster-menu-item",
  forItemsOfKind: dashboardKind,
  orderNumber: removalOrder - 0.1,
  Component: RemoveFromCluster,
});

const Delete = ({ data }: DashboardData) => {
  const actions = useInject(dashboardActionsInjectable)();
  const item = useItem(data.kind, ...data.ids);

  return (
    <DropDownMenuItemRow Icon={DeleteOutlineIcon} $onClick={() => void actions.remove(addressOf(data).dashboardId)}>
      {item?.mirrored ? "Delete from all clusters" : "Delete"}
    </DropDownMenuItemRow>
  );
};

export const deleteMenuItem = getNavigatorItemMenuItemInjectableBunch({
  id: "prom-king-delete-dashboard-menu-item",
  forItemsOfKind: dashboardKind,
  orderNumber: removalOrder,
  Component: Delete,
});
