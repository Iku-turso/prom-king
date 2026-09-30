import { Div, P, Span } from "@k8slens/element-components";
import { PlainButton, PrimaryButton, MultiSelect } from "@k8slens/input-components";
import { ModalContainer, ModalContent, ModalFooter, ModalHeader } from "@k8slens/modal-components";
import { getModalInjectableBunch, getModalKind, type ModalProps, useRespondFromModal } from "@k8slens/modal-contracts";
import { useState } from "react";

export interface PickableCluster {
  readonly id: string;
  readonly name: string;
}

export interface ClusterSelection {
  /** Every cluster, those added later included. */
  readonly all: boolean;
  readonly clusterIds: readonly string[];
}

export interface ClusterPickerInput {
  readonly heading: string;
  readonly explanation: string;
  readonly confirmLabel: string;
  readonly clusters: readonly PickableCluster[];
  /** Whether "all clusters, those added later included" is on offer. */
  readonly allowAll: boolean;
  readonly initial: ClusterSelection;
  /** A cluster that stays picked: the one the dashboard is being looked at under. */
  readonly required?: string;
}

/** Asks which clusters; answers with the choice, or nothing when the user turned away. */
export const clusterPickerModalKind = getModalKind<[input: ClusterPickerInput], ClusterSelection | undefined>()(
  "cluster-picker",
);

const allOption = [{ id: "all" as const, label: "All clusters: every current cluster and every cluster added later" }];

const ClusterPickerModal = ({ input: [input] }: ModalProps<typeof clusterPickerModalKind>) => {
  const respond = useRespondFromModal(clusterPickerModalKind);
  const [all, setAll] = useState(input.initial.all);
  const [picked, setPicked] = useState<readonly string[]>(() => [
    ...new Set([...input.initial.clusterIds, ...(input.required ? [input.required] : [])]),
  ]);

  const toggle = (clusterId: string) => {
    if (clusterId === input.required) return;

    setPicked(picked.includes(clusterId) ? picked.filter((id) => id !== clusterId) : [...picked, clusterId]);
  };

  const canConfirm = all || picked.length > 0;

  return (
    <ModalContainer $style={{ width: "min(calc(var(--unit) * 130), 90vw)" }}>
      <ModalHeader>{input.heading}</ModalHeader>

      <ModalContent>
        <Div $flex={{ direction: "vertical", gap: "m" }}>
          <P $color="textMuted" $font={{ size: "s" }} $style={{ margin: 0 }}>
            {input.explanation}
          </P>

          {input.allowAll && (
            <MultiSelect options={allOption} selected={all ? ["all"] : []} onToggle={() => setAll(!all)} />
          )}

          {input.clusters.length === 0 ? (
            <Span $color="textMuted">There are no other clusters.</Span>
          ) : (
            <Div
              $border={{ color: "borderPrimary", width: "xxs", radius: "s" }}
              $overflow="auto"
              $faded={all}
              $style={{ maxHeight: "calc(var(--unit) * 80)" }}
            >
              <MultiSelect
                options={input.clusters.map((cluster) => ({
                  id: cluster.id,
                  label: cluster.id === input.required ? `${cluster.name} (this cluster)` : cluster.name,
                }))}
                selected={all ? input.clusters.map((cluster) => cluster.id) : picked}
                onToggle={(clusterId) => !all && toggle(clusterId)}
              />
            </Div>
          )}
        </Div>
      </ModalContent>

      <ModalFooter>
        <Div $flex={{ direction: "horizontal", gap: "s" }}>
          <PlainButton onClick={() => respond(undefined)}>Cancel</PlainButton>

          <PrimaryButton
            $disabled={!canConfirm}
            $tooltip={canConfirm ? undefined : "Pick at least one cluster"}
            onClick={() => respond({ all, clusterIds: all ? [] : picked })}
          >
            {input.confirmLabel}
          </PrimaryButton>
        </Div>
      </ModalFooter>
    </ModalContainer>
  );
};

export default getModalInjectableBunch({
  kind: clusterPickerModalKind,
  Component: ClusterPickerModal,
  onClose: () => undefined,
});
