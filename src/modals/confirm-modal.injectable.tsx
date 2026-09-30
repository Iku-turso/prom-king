import { P } from "@k8slens/element-components";
import { ConfirmationModal } from "@k8slens/modal-components";
import { getModalInjectableBunch, getModalKind, type ModalProps, useRespondFromModal } from "@k8slens/modal-contracts";

/** Asks before something that cannot be taken back; answers whether to go ahead. */
export const confirmModalKind = getModalKind<[title: string, explanation: string, confirmLabel: string], boolean>()(
  "confirm",
);

const ConfirmModal = ({ input: [title, explanation, confirmLabel] }: ModalProps<typeof confirmModalKind>) => {
  const respond = useRespondFromModal(confirmModalKind);

  return (
    <ConfirmationModal
      title={title}
      confirmLabel={confirmLabel}
      destructive
      onConfirm={() => respond(true)}
      onCancel={() => respond(false)}
    >
      <P>{explanation}</P>
    </ConfirmationModal>
  );
};

export default getModalInjectableBunch({
  kind: confirmModalKind,
  Component: ConfirmModal,
  onClose: () => false,
});
