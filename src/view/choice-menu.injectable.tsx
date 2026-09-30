import { DropDownMenuItemRow } from "@k8slens/drop-down-menu-items";
import {
  dropDownMenu,
  getDropDownMenuItemsInjectableBunch,
  getDropDownMenuKind,
  useCloseDropDownMenu,
} from "@k8slens/drop-down-menu-contracts";
import { Button, type ButtonProps } from "@k8slens/element-components";
import { CheckIcon, ExpandMoreIcon } from "@k8slens/icon";

export interface ChoiceOption {
  readonly id: string;
  readonly label: string;
}

/** What a choice menu is opened with: what to offer, which one is picked, and what picking does. */
export interface ChoiceMenuData {
  readonly options: readonly ChoiceOption[];
  readonly selected: string;
  readonly onSelect: (id: string) => void;
}

/** One menu for every pick-one-of-these of the extension: time range, refresh interval, unit, width. */
export const choiceMenuKind = getDropDownMenuKind<ChoiceMenuData>()("prom-king-choice-menu");

const Choice = ({ data, option }: { data: ChoiceMenuData; option: ChoiceOption }) => {
  const close = useCloseDropDownMenu();

  return (
    <DropDownMenuItemRow
      trailing={option.id === data.selected ? <CheckIcon /> : undefined}
      $onClick={() => {
        data.onSelect(option.id);
        close();
      }}
    >
      {option.label}
    </DropDownMenuItemRow>
  );
};

export const choiceMenuItemsBunch = getDropDownMenuItemsInjectableBunch({
  id: "prom-king-choice-menu-items",
  kind: choiceMenuKind,
  instantiate: () => (data) =>
    data.options.map((option, index) => ({
      id: `choice-${option.id}`,
      orderNumber: index,
      Component: Choice,
      componentProps: { option },
    })),
});

export interface ChoiceButtonProps<Id extends string | number> extends Omit<ButtonProps, "onSelect"> {
  readonly options: readonly { readonly id: Id; readonly label: string }[];
  readonly selected: Id;
  readonly onSelect: (id: Id) => void;
  /** What the button says, when not the picked option's own label: a short form where room is scarce. */
  readonly label?: string;
}

/** A button naming what is picked, opening the menu to pick something else. */
export const ChoiceButton = <Id extends string | number>({
  options,
  selected,
  onSelect,
  label,
  ...rest
}: ChoiceButtonProps<Id>) => (
  <Button
    // The menu positions itself against the nearest anchor around it.
    $anchor
    $flex={{ direction: "horizontal", gap: "xxs", verticalAlign: "center" }}
    $padding={{ horizontal: "s", vertical: "xxs" }}
    $border={{ color: "borderPrimary", width: "xxs", radius: "s" }}
    $backgroundColor="backgroundPrimary"
    $color="textDefault"
    $dropDownMenu={dropDownMenu(choiceMenuKind, {
      data: {
        options: options.map((option) => ({ id: String(option.id), label: option.label })),
        selected: String(selected),
        onSelect: (id) => onSelect(options.find((option) => String(option.id) === id)!.id),
      },
    })}
    {...rest}
  >
    {label ?? options.find((option) => option.id === selected)?.label ?? String(selected)}
    <ExpandMoreIcon $size="s" />
  </Button>
);
