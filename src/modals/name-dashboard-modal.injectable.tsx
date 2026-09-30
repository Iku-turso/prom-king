import { Div, Form, Label, Span } from "@k8slens/element-components";
import { DashboardIcon } from "@k8slens/icon";
import { PlainButton, PrimaryButton, TextInput } from "@k8slens/input-components";
import { ModalContainer, ModalContent, ModalFooter, ModalHeader } from "@k8slens/modal-components";
import { getModalInjectableBunch, getModalKind, type ModalProps, useRespondFromModal } from "@k8slens/modal-contracts";
import { useState } from "react";

/** Opened with its title, its button's label and the name to start from; answers with the name, or nothing. */
export const nameDashboardModalKind = getModalKind<
  [title: string, confirmLabel: string, initialName: string],
  string | undefined
>()("name-dashboard");

const NameDashboardModal = ({ input: [title, confirmLabel, initialName] }: ModalProps<typeof nameDashboardModalKind>) => {
  const respond = useRespondFromModal(nameDashboardModalKind);
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();

  return (
    <ModalContainer $style={{ width: "calc(var(--unit) * 110)" }}>
      <ModalHeader icon={<DashboardIcon />}>{title}</ModalHeader>

      <Form
        onSubmit={(event) => {
          event.preventDefault();

          if (trimmed) {
            respond(trimmed);
          }
        }}
      >
        <ModalContent>
          <Label $flex={{ direction: "vertical", gap: "xs" }}>
            <Span $font={{ size: "s" }} $color="textMuted">
              Name
            </Span>

            <TextInput autoFocus value={name} placeholder="API server health" onChange={(event) => setName(event.target.value)} />
          </Label>
        </ModalContent>

        <ModalFooter>
          <Div $flex={{ direction: "horizontal", gap: "s" }}>
            <PlainButton onClick={() => respond(undefined)}>Cancel</PlainButton>

            <PrimaryButton type="submit" $disabled={!trimmed} $tooltip={trimmed ? undefined : "A dashboard needs a name"}>
              {confirmLabel}
            </PrimaryButton>
          </Div>
        </ModalFooter>
      </Form>
    </ModalContainer>
  );
};

export default getModalInjectableBunch({
  kind: nameDashboardModalKind,
  Component: NameDashboardModal,
  onClose: () => undefined,
});
