import { dropDownMenu } from "@k8slens/drop-down-menu-contracts";
import { Button, Div, H2, Span } from "@k8slens/element-components";
import {
  AddIcon,
  ArrowBackIcon,
  ArrowForwardIcon,
  ContentCopyIcon,
  DashboardIcon,
  DeleteOutlineIcon,
  DoneIcon,
  EditIcon,
  ExpandMoreIcon,
  LayersIcon,
  OpenInBrowserIcon,
  RefreshIcon,
  ShareIcon,
  SpinnerIcon,
} from "@k8slens/icon";
import { PlainButton, PrimaryButton } from "@k8slens/input-components";
import { useInject } from "@k8slens/use-inject";
import { observer } from "mobx-react";
import type { ReactNode } from "react";
import { PanelChart } from "../chart/panel-chart";
import { panelDataInjectable, panelQueryKey } from "../chart/panel-data.injectable";
import {
  type Dashboard,
  isMirrored,
  isShownOn,
  type Panel,
  panelTimeRange,
  panelWidths,
  refreshIntervals,
  scopeLabel,
  shortTimeRangeLabel,
  type TimeRange,
  timeRanges,
} from "../dashboards/dashboard";
import { dashboardActionsInjectable, dashboardEditingInjectable } from "../dashboards/dashboard-actions.injectable";
import { dashboardInjectable } from "../dashboards/dashboards.injectable";
import { type DashboardAddress, dashboardViewId } from "../open/dashboard-address";
import { openDashboardInWindowInjectable } from "../open/open-dashboard.injectable";
import { ChoiceButton } from "./choice-menu.injectable";
import { clusterLabelInjectable } from "./cluster-label.injectable";
import styles from "./dashboard-view.module.scss";
import { examplesMenuKind } from "./examples-menu.injectable";
import { ToolButton } from "./tool-button";

export interface DashboardViewProps extends DashboardAddress {
  /** Where the dashboard is shown: a tab offers a window of its own, a window does not. */
  readonly place: "tab" | "window";
}

const Centered = ({ children }: { children: ReactNode }) => (
  <Div $flex={{ direction: "vertical", gap: "m", horizontalAlign: "center", verticalAlign: "center" }} $padding="3xl" $height="full">
    {children}
  </Div>
);

/** A button opening the examples, adding the one picked to the dashboard as it is. */
const AddExampleButton = ({ dashboardId, primary }: { dashboardId: string; primary?: boolean }) => {
  const actions = useInject(dashboardActionsInjectable)();

  return (
    <Button
      $anchor
      $flex={{ direction: "horizontal", gap: "xxs", verticalAlign: "center" }}
      $padding={{ horizontal: "m", vertical: "xs" }}
      $border={{ color: primary ? "primary" : "borderPrimary", width: "xxs", radius: "s" }}
      $backgroundColor="backgroundPrimary"
      $color="textDefault"
      $dropDownMenu={dropDownMenu(examplesMenuKind, {
        data: { onPick: (example) => void actions.addExamplePanel(dashboardId, example) },
      })}
    >
      <LayersIcon $size="s" />
      Add example panel
      <ExpandMoreIcon $size="s" />
    </Button>
  );
};

const panelTimeRangeOptions = (dashboard: Dashboard) => [
  { id: 0, label: `Dashboard's (${shortTimeRangeLabel(dashboard.timeRange)})` },
  ...timeRanges,
];

interface PanelCardProps {
  readonly clusterId: string;
  readonly dashboard: Dashboard;
  readonly panel: Panel;
  readonly index: number;
  readonly viewKey: string;
  readonly editing: boolean;
}

const PanelCard = observer(({ clusterId, dashboard, panel, index, viewKey, editing }: PanelCardProps) => {
  const actions = useInject(dashboardActionsInjectable)();
  const timeRange = panelTimeRange(dashboard, panel);
  const ownTimeRange = panel.timeRange !== undefined;

  return (
    <Div
      $className={[styles.panel, styles[panel.width], styles[panel.height], { [styles.editing!]: editing }]}
      $backgroundColor="backgroundSecondary"
      $border={{ color: editing ? "primary" : "borderPrimary", width: "xxs", radius: "m" }}
      $padding={{ horizontal: "m", vertical: "s" }}
      $flex={{ direction: "vertical", gap: "xs" }}
    >
      <Div $flex={{ direction: "horizontal", gap: "xs", verticalAlign: "center" }}>
        <Span
          $flexChild
          $font={{ bold: true, size: "s" }}
          $tooltip={{ contentText: panel.query, position: "bottom" }}
          $style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {panel.title}
        </Span>

        <Div $className={styles.panelActions} $flex={{ direction: "horizontal", gap: "xxs", verticalAlign: "center" }}>
          {editing && (
            <>
              <ToolButton $tooltip="Move earlier" $enabled={index > 0} $onClick={() => void actions.movePanel(dashboard.id, panel.id, -1)}>
                <ArrowBackIcon $size="s" />
              </ToolButton>
              <ToolButton
                $tooltip="Move later"
                $enabled={index < dashboard.panels.length - 1}
                $onClick={() => void actions.movePanel(dashboard.id, panel.id, 1)}
              >
                <ArrowForwardIcon $size="s" />
              </ToolButton>
              <ChoiceButton
                options={panelWidths}
                selected={panel.width}
                onSelect={(width) => void actions.setPanelWidth(dashboard.id, panel.id, width)}
                $tooltip="Width"
                $padding={{ horizontal: "xs", vertical: "zero" }}
                $font={{ size: "xs" }}
              />
              <ToolButton $tooltip="Duplicate panel" $onClick={() => void actions.duplicatePanel(dashboard.id, panel.id)}>
                <ContentCopyIcon $size="s" />
              </ToolButton>
              <ToolButton $tooltip="Remove panel" $onClick={() => void actions.removePanel(dashboard.id, panel.id)}>
                <DeleteOutlineIcon $size="s" />
              </ToolButton>
            </>
          )}

          <ToolButton $tooltip="Edit panel" $onClick={() => void actions.editPanel(clusterId, dashboard.id, panel.id)}>
            <EditIcon $size="s" />
          </ToolButton>
        </Div>

        <ChoiceButton
          options={panelTimeRangeOptions(dashboard)}
          selected={panel.timeRange ?? 0}
          onSelect={(picked) => void actions.setPanelTimeRange(dashboard.id, panel.id, picked === 0 ? undefined : (picked as TimeRange))}
          $tooltip={ownTimeRange ? "This panel's own time range" : "Follows the dashboard's time range"}
          $padding={{ horizontal: "xs", vertical: "zero" }}
          $font={{ size: "xs" }}
          $color={ownTimeRange ? "textHighlight" : "textMuted"}
          $border={{ color: ownTimeRange ? "primary" : "borderPrimary", width: "xxs", radius: "s" }}
          label={shortTimeRangeLabel(timeRange)}
        />
      </Div>

      <Div $className={styles.panelBody}>
        <PanelChart
          chartKey={`${viewKey}:${panel.id}`}
          panelQuery={{ clusterId, query: panel.query, timeRange, refreshInterval: dashboard.refreshInterval }}
          chartType={panel.chartType}
          unit={panel.unit}
          legend={panel.legend}
          max={panel.max}
        />
      </Div>
    </Div>
  );
});

/** A dashboard of a cluster, the same in a tab and in a window of its own. */
export const DashboardView = observer(({ clusterId, dashboardId, place }: DashboardViewProps) => {
  const dashboard = useInject(dashboardInjectable)(dashboardId).get();
  const clusterLabel = useInject(clusterLabelInjectable)(clusterId).get();
  const actions = useInject(dashboardActionsInjectable)();
  const panelData = useInject(panelDataInjectable);
  const openInWindow = useInject(openDashboardInWindowInjectable)();
  const viewKey = `${place}:${dashboardViewId({ clusterId, dashboardId })}`;
  const { editing, toggle } = useInject(dashboardEditingInjectable)(viewKey);

  if (dashboard === undefined) {
    return (
      <Centered>
        <SpinnerIcon $size="xl" />
      </Centered>
    );
  }

  if (dashboard === null || !isShownOn(dashboard, clusterId)) {
    return (
      <Centered>
        <DashboardIcon $size="3xl" $color="textMuted" />
        <Span $color="textMuted">
          {dashboard === null ? "This dashboard has been deleted." : `This dashboard is no longer shown on ${clusterLabel}.`}
        </Span>
      </Centered>
    );
  }

  const isEditing = editing.get();

  const refreshAll = () => {
    for (const panel of dashboard.panels) {
      void panelData(
        panelQueryKey({
          clusterId,
          query: panel.query,
          timeRange: panelTimeRange(dashboard, panel),
          refreshInterval: dashboard.refreshInterval,
        }),
      ).refresh();
    }
  };

  return (
    <Div $flex={{ direction: "vertical", gap: "l" }} $padding="xl" $color="textDefault">
      <Div $flex={{ direction: "horizontal", gap: "m", verticalAlign: "center", wrap: true }}>
        <Div $flex={{ direction: "horizontal", gap: "s", verticalAlign: "center" }} $flexChild $style={{ minWidth: 0 }}>
          <DashboardIcon $size="l" />

          <Div $flex={{ direction: "vertical" }} $style={{ minWidth: 0 }}>
            <Div $flex={{ direction: "horizontal", gap: "xs", verticalAlign: "center" }}>
              <H2 $font={{ size: "xl", bold: true }} $style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {dashboard.name}
              </H2>

              {isEditing && (
                <ToolButton $tooltip="Rename dashboard" $onClick={() => void actions.rename(dashboard.id)}>
                  <EditIcon $size="s" />
                </ToolButton>
              )}
            </Div>

            <Div $flex={{ direction: "horizontal", gap: "xs", verticalAlign: "center" }} $font={{ size: "s" }} $color="textMuted">
              <Span>{clusterLabel}</Span>
              <Span>·</Span>
              <Button
                $interactive
                $padding={{ horizontal: "xxs" }}
                $border={{ radius: "s" }}
                $backgroundColor="transparent"
                $color="inherit"
                $tooltip="Choose which clusters show this dashboard"
                $onClick={() => void actions.mirror(dashboard.id, clusterId)}
              >
                {scopeLabel(dashboard.scope)}
              </Button>
            </Div>
          </Div>
        </Div>

        <Div $flex={{ direction: "horizontal", gap: "s", verticalAlign: "center", wrap: true }}>
          <ChoiceButton
            options={timeRanges}
            selected={dashboard.timeRange}
            onSelect={(timeRange) => void actions.setTimeRange(dashboard.id, timeRange)}
            $tooltip="Time range of the panels that have none of their own"
          />

          <ChoiceButton
            options={refreshIntervals.map((interval) => ({
              id: interval.id,
              label: interval.id === 0 ? "Auto refresh off" : `Every ${interval.label}`,
            }))}
            selected={dashboard.refreshInterval}
            onSelect={(interval) => void actions.setRefreshInterval(dashboard.id, interval)}
            $tooltip="Auto refresh"
          />

          <ToolButton $tooltip="Refresh now" $onClick={refreshAll}>
            <RefreshIcon />
          </ToolButton>

          <ToolButton $tooltip="Mirror to other clusters" $onClick={() => void actions.mirror(dashboard.id, clusterId)}>
            <ShareIcon />
          </ToolButton>

          <ToolButton $tooltip="Copy to other clusters" $onClick={() => void actions.copyTo(dashboard.id, clusterId)}>
            <ContentCopyIcon />
          </ToolButton>

          {place === "tab" && (
            <ToolButton $tooltip="Open in new window" $onClick={() => void openInWindow({ clusterId, dashboardId })}>
              <OpenInBrowserIcon />
            </ToolButton>
          )}

          {isEditing && (
            <>
              <AddExampleButton dashboardId={dashboard.id} />
              <PlainButton Icon={AddIcon} onClick={() => void actions.addPanel(clusterId, dashboard.id)}>
                Add panel
              </PlainButton>
              <ToolButton
                $tooltip={isMirrored(dashboard.scope) ? "Delete from all clusters" : "Delete dashboard"}
                $onClick={() => void actions.remove(dashboard.id)}
              >
                <DeleteOutlineIcon />
              </ToolButton>
            </>
          )}

          {isEditing ? (
            <PrimaryButton Icon={DoneIcon} onClick={toggle}>
              Done
            </PrimaryButton>
          ) : (
            <PlainButton Icon={EditIcon} onClick={toggle}>
              Edit
            </PlainButton>
          )}
        </Div>
      </Div>

      {dashboard.panels.length === 0 ? (
        <Centered>
          <DashboardIcon $size="3xl" $color="textMuted" />
          <Span $color="textMuted">This dashboard has no panels yet.</Span>
          <Div $flex={{ direction: "horizontal", gap: "s" }}>
            <AddExampleButton dashboardId={dashboard.id} primary />
            <PrimaryButton Icon={AddIcon} onClick={() => void actions.addPanel(clusterId, dashboard.id)}>
              Add panel
            </PrimaryButton>
          </Div>
        </Centered>
      ) : (
        <Div $className={styles.panels}>
          {dashboard.panels.map((panel, index) => (
            <PanelCard
              key={panel.id}
              clusterId={clusterId}
              dashboard={dashboard}
              panel={panel}
              index={index}
              viewKey={viewKey}
              editing={isEditing}
            />
          ))}
        </Div>
      )}
    </Div>
  );
});
