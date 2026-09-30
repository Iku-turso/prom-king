import { Div } from "@k8slens/element-components";
import { getSubWindowKindInjectableBunch, type SubWindowContentProps } from "@k8slens/sub-window-contracts";
import { DashboardView } from "../view/dashboard-view";
import { dashboardSubWindowKind } from "./view-kinds";

const DashboardWindow = ({ params: { clusterId, dashboardId } }: SubWindowContentProps<typeof dashboardSubWindowKind>) => (
  <Div $height="full" $backgroundColor="backgroundPrimary" $color="textDefault" $overflow="auto">
    <DashboardView clusterId={clusterId} dashboardId={dashboardId} place="window" />
  </Div>
);

export default getSubWindowKindInjectableBunch({
  kind: dashboardSubWindowKind,
  Component: DashboardWindow,
  configuration: {
    title: ({ title }) => title,
    defaultWidth: 1280,
    defaultHeight: 860,
    minWidth: 560,
    minHeight: 400,
  },
});
