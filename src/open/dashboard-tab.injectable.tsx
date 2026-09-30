import { Div, Span } from "@k8slens/element-components";
import { DashboardIcon } from "@k8slens/icon";
import { mainViewTabHostKind } from "@k8slens/main-view-contracts";
import { getTabKindInjectableBunch, type TabProps } from "@k8slens/tab-contracts";
import { useInject } from "@k8slens/use-inject";
import { observer } from "mobx-react";
import { dashboardInjectable } from "../dashboards/dashboards.injectable";
import { DashboardView } from "../view/dashboard-view";
import { parseDashboardViewId } from "./dashboard-address";
import { dashboardTabKind } from "./view-kinds";

const DashboardTabTitle = observer(({ tabId }: TabProps<typeof mainViewTabHostKind>) => {
  const { dashboardId } = parseDashboardViewId(tabId);
  const dashboard = useInject(dashboardInjectable)(dashboardId).get();

  return (
    <Div $flex={{ direction: "horizontal", gap: "xs", verticalAlign: "center" }}>
      <DashboardIcon $size="s" />
      <Span>{dashboard?.name ?? (dashboard === null ? "Deleted dashboard" : "Dashboard")}</Span>
    </Div>
  );
});

const DashboardTab = ({ tabId }: TabProps<typeof mainViewTabHostKind>) => {
  const address = parseDashboardViewId(tabId);

  return (
    <Div $height="full" $overflow="auto">
      <DashboardView {...address} place="tab" />
    </Div>
  );
};

export default getTabKindInjectableBunch({
  tabHostKind: mainViewTabHostKind,
  kind: dashboardTabKind,
  Component: DashboardTab,
  Title: DashboardTabTitle,
});
