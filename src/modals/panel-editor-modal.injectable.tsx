import { dropDownMenu } from "@k8slens/drop-down-menu-contracts";
import { Button, Div, Label, Span, TextArea } from "@k8slens/element-components";
import { ExpandMoreIcon, PlayArrowIcon } from "@k8slens/icon";
import { PlainButton, PrimaryButton, TextInput } from "@k8slens/input-components";
import { ModalContainer, ModalContent, ModalFooter, ModalHeader } from "@k8slens/modal-components";
import { getModalInjectableBunch, getModalKind, type ModalProps, useRespondFromModal } from "@k8slens/modal-contracts";
import { type ReactNode, useState } from "react";
import { PanelChart } from "../chart/panel-chart";
import {
  chartTypes,
  panelHeights,
  type PanelDraft,
  panelUnits,
  panelWidths,
  type TimeRange,
  timeRangeLabel,
  timeRanges,
} from "../dashboards/dashboard";
import { chartTypeIcons } from "../view/chart-type-icons";
import { ChoiceButton } from "../view/choice-menu.injectable";
import { examplesMenuKind } from "../view/examples-menu.injectable";

/** Opened over a cluster to preview against, with the panel as it is; answers with the panel as edited, or nothing. */
export const panelEditorModalKind = getModalKind<
  [heading: string, clusterId: string, dashboardTimeRange: TimeRange, draft: PanelDraft],
  PanelDraft | undefined
>()("panel-editor");

const Field = ({ label, hint, children, grow }: { label: string; hint?: ReactNode; children: ReactNode; grow?: boolean }) => (
  <Label $flex={{ direction: "vertical", gap: "xs" }} $flexChild={grow ? true : undefined} $style={{ minWidth: 0 }}>
    <Span $font={{ size: "s" }} $color="textMuted">
      {label}
    </Span>

    {children}

    {hint && (
      <Span $font={{ size: "xs" }} $color="textMuted">
        {hint}
      </Span>
    )}
  </Label>
);

const usesMaximum = (draft: PanelDraft) => draft.chartType === "gauge" || draft.chartType === "bar-gauge";

const PanelEditorModal = ({ input: [heading, clusterId, dashboardTimeRange, initial] }: ModalProps<typeof panelEditorModalKind>) => {
  const respond = useRespondFromModal(panelEditorModalKind);
  const [draft, setDraft] = useState<PanelDraft>(initial);
  const [previewedQuery, setPreviewedQuery] = useState(initial.query);
  const [maxText, setMaxText] = useState(initial.max === undefined ? "" : String(initial.max));
  const change = (patch: Partial<PanelDraft>) => setDraft({ ...draft, ...patch });
  const complete = draft.title.trim() !== "" && draft.query.trim() !== "";
  const timeRange = draft.timeRange ?? dashboardTimeRange;
  const max = maxText.trim() === "" || !Number.isFinite(Number(maxText)) ? undefined : Number(maxText);

  const timeRangeOptions = [
    { id: 0, label: `Dashboard's (${timeRangeLabel(dashboardTimeRange).toLowerCase()})` },
    ...timeRanges,
  ];

  const answer = (): PanelDraft => {
    const { max: _max, ...rest } = draft;

    return {
      ...rest,
      title: draft.title.trim(),
      query: draft.query.trim(),
      legend: draft.legend.trim(),
      ...(usesMaximum(draft) && max !== undefined ? { max } : {}),
    };
  };

  return (
    <ModalContainer $style={{ width: "min(calc(var(--unit) * 250), 94vw)" }}>
      <ModalHeader>{heading}</ModalHeader>

      <ModalContent $overflow="auto" $style={{ maxHeight: "82vh" }}>
        <Div $flex={{ direction: "vertical", gap: "m" }}>
          <Div $flex={{ direction: "horizontal", gap: "m", verticalAlign: "bottom", wrap: true }}>
            <Field label="Title" grow>
              <TextInput
                autoFocus
                value={draft.title}
                placeholder="CPU utilization by namespace"
                onChange={(event) => change({ title: event.target.value })}
              />
            </Field>

            <Button
              $anchor
              $flex={{ direction: "horizontal", gap: "xxs", verticalAlign: "center" }}
              $padding={{ horizontal: "m", vertical: "xs" }}
              $border={{ color: "borderPrimary", width: "xxs", radius: "s" }}
              $backgroundColor="backgroundPrimary"
              $color="textDefault"
              $tooltip="Start from a ready-made panel"
              $dropDownMenu={dropDownMenu(examplesMenuKind, {
                data: {
                  onPick: (example) => {
                    setDraft({ ...example, width: draft.width, height: example.height });
                    setMaxText(example.max === undefined ? "" : String(example.max));
                    setPreviewedQuery(example.query);
                  },
                },
                position: "bottom span-left",
              })}
            >
              Examples
              <ExpandMoreIcon $size="s" />
            </Button>
          </Div>

          <Field label="Chart">
            <Div $flex={{ direction: "horizontal", gap: "xs", wrap: true }}>
              {chartTypes.map((type) => {
                const Icon = chartTypeIcons[type.id];
                const active = draft.chartType === type.id;

                return (
                  <Button
                    key={type.id}
                    $flex={{ direction: "vertical", gap: "xxs", horizontalAlign: "center", verticalAlign: "center" }}
                    $padding={{ horizontal: "s", vertical: "xs" }}
                    $border={{ color: active ? "primary" : "borderPrimary", width: "xxs", radius: "s" }}
                    $backgroundColor={active ? "backgroundSecondary" : "backgroundPrimary"}
                    $color={active ? "textHighlight" : "textMuted"}
                    $interactive={{ active }}
                    $style={{ minWidth: "calc(var(--unit) * 22)" }}
                    $onClick={() => change({ chartType: type.id })}
                  >
                    <Icon $size="l" />
                    <Span $font={{ size: "xs" }}>{type.label}</Span>
                  </Button>
                );
              })}
            </Div>
          </Field>

          <Field label="PromQL query" hint="Press ⌘/Ctrl+Enter to run it in the preview.">
            <TextArea
              value={draft.query}
              rows={3}
              spellCheck={false}
              placeholder='sum by (namespace) (rate(container_cpu_usage_seconds_total{pod!="", container=""}[5m]))'
              $padding="s"
              $border={{ color: "borderPrimary", width: "xxs", radius: "s" }}
              $backgroundColor="backgroundPrimary"
              $color="code"
              $font={{ size: "s" }}
              $style={{ fontFamily: "var(--font-monospace, monospace)", resize: "vertical" }}
              onChange={(event) => change({ query: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  setPreviewedQuery(draft.query);
                }
              }}
            />
          </Field>

          <Div $flex={{ direction: "horizontal", gap: "m", wrap: true, verticalAlign: "top" }}>
            <Field label="Legend" hint="{{label}} stands for a label's value." grow>
              <TextInput value={draft.legend} placeholder="{{namespace}}" onChange={(event) => change({ legend: event.target.value })} />
            </Field>

            <Field label="Unit">
              <ChoiceButton options={panelUnits} selected={draft.unit} onSelect={(unit) => change({ unit })} />
            </Field>

            <Field label="Time range">
              <ChoiceButton
                options={timeRangeOptions}
                selected={draft.timeRange ?? 0}
                onSelect={(picked) => {
                  const { timeRange: _previous, ...rest } = draft;

                  setDraft(picked === 0 ? rest : { ...rest, timeRange: picked as TimeRange });
                }}
              />
            </Field>

            <Field label="Width">
              <ChoiceButton options={panelWidths} selected={draft.width} onSelect={(width) => change({ width })} />
            </Field>

            <Field label="Height">
              <ChoiceButton options={panelHeights} selected={draft.height} onSelect={(height) => change({ height })} />
            </Field>

            {usesMaximum(draft) && (
              <Field label="Full at">
                <TextInput
                  $width="5xl"
                  type="number"
                  value={maxText}
                  placeholder="Auto"
                  onChange={(event) => setMaxText(event.target.value)}
                />
              </Field>
            )}
          </Div>

          <Div $flex={{ direction: "vertical", gap: "xs" }}>
            <Div $flex={{ direction: "horizontal", gap: "s", verticalAlign: "center", horizontalAlign: "space-between" }}>
              <Span $font={{ size: "s" }} $color="textMuted">
                Preview · {timeRangeLabel(timeRange).toLowerCase()}
              </Span>

              <PlainButton Icon={PlayArrowIcon} $disabled={draft.query.trim() === ""} onClick={() => setPreviewedQuery(draft.query)}>
                Run query
              </PlainButton>
            </Div>

            <Div
              $padding="m"
              $border={{ color: "borderPrimary", width: "xxs", radius: "m" }}
              $backgroundColor="backgroundSecondary"
              $style={{ height: "calc(var(--unit) * 72)" }}
            >
              {previewedQuery.trim() ? (
                <PanelChart
                  chartKey={`preview:${clusterId}`}
                  panelQuery={{ clusterId, query: previewedQuery, timeRange, refreshInterval: 0 }}
                  chartType={draft.chartType}
                  unit={draft.unit}
                  legend={draft.legend}
                  max={max}
                />
              ) : (
                <Div $flex={{ direction: "vertical", horizontalAlign: "center", verticalAlign: "center" }} $height="full">
                  <Span $color="textMuted">Write a query, or pick one from Examples, to see it here.</Span>
                </Div>
              )}
            </Div>
          </Div>
        </Div>
      </ModalContent>

      <ModalFooter>
        <Div $flex={{ direction: "horizontal", gap: "s" }}>
          <PlainButton onClick={() => respond(undefined)}>Cancel</PlainButton>

          <PrimaryButton
            $disabled={!complete}
            $tooltip={complete ? undefined : "A panel needs a title and a query"}
            onClick={() => respond(answer())}
          >
            Save panel
          </PrimaryButton>
        </Div>
      </ModalFooter>
    </ModalContainer>
  );
};

export default getModalInjectableBunch({
  kind: panelEditorModalKind,
  Component: PanelEditorModal,
  onClose: () => undefined,
});
