import { ClickableDiv } from "@k8slens/element-components";
import { DashboardIcon, OpenInBrowserIcon, ShareIcon } from "@k8slens/icon";
import {
  NavigatorItemActions,
  NavigatorItemIcon,
  NavigatorItemLabel,
  NavigatorLeafIndicator,
} from "@k8slens/navigator-components";
import { getNavigatorItemKindInjectableBunch, type NavigatorItemProps } from "@k8slens/navigator-contracts";
import { useInject } from "@k8slens/use-inject";
import { ToolButton } from "../view/tool-button";
import { computed, when } from "mobx";
import { isMirrored, isShownOn, scopeLabel } from "../dashboards/dashboard";
import { dashboardsInjectable } from "../dashboards/dashboards.injectable";
import { openDashboardInTabInjectable, openDashboardInWindowInjectable } from "../open/open-dashboard.injectable";
import { type DashboardItem, dashboardKind, dashboardsGroupKind } from "./navigator-kinds";

const DashboardRow = ({ ids, item }: NavigatorItemProps<DashboardItem, typeof dashboardsGroupKind>) => {
  const openInTab = useInject(openDashboardInTabInjectable)();
  const openInWindow = useInject(openDashboardInWindowInjectable)();
  const [clusterId] = ids;
  const address = { clusterId: clusterId!, dashboardId: item.id };

  return (
    <>
      <NavigatorLeafIndicator />

      <NavigatorItemIcon>
        <DashboardIcon />
      </NavigatorItemIcon>

      <NavigatorItemLabel>
        <ClickableDiv
          $onClick={() => void openInTab(address)}
          $onMiddleClick={() => void openInWindow(address)}
          $tooltip={{
            position: "right",
            contentText: `${item.name} · ${item.panelCount} panel${item.panelCount === 1 ? "" : "s"} · ${item.scopeLabel}`,
          }}
          $style={{ overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {item.name}
        </ClickableDiv>
      </NavigatorItemLabel>

      <NavigatorItemActions>
        {item.mirrored && <ShareIcon $size="s" $color="textMuted" $tooltip={item.scopeLabel} />}

        <ToolButton $tooltip="Open in new window" $onClick={() => void openInWindow(address)}>
          <OpenInBrowserIcon />
        </ToolButton>
      </NavigatorItemActions>
    </>
  );
};

export default getNavigatorItemKindInjectableBunch({
  kind: dashboardKind,
  parentKind: dashboardsGroupKind,
  description: "One custom Prometheus dashboard, shown for the cluster it hangs under.",

  items: {
    instantiate: (di) => {
      const { all } = di.inject(dashboardsInjectable)();

      return async (clusterId) => {
        // Resolved once the dashboards are read, so the navigator's first answer is the real one.
        await when(() => all.get() !== undefined);

        return computed(() =>
          (all.get() ?? [])
            .filter((dashboard) => isShownOn(dashboard, clusterId))
            .map((dashboard): DashboardItem => ({
              id: dashboard.id,
              name: dashboard.name,
              panelCount: dashboard.panels.length,
              mirrored: isMirrored(dashboard.scope),
              scopeLabel: scopeLabel(dashboard.scope),
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      };
    },
  },

  Component: DashboardRow,
});
