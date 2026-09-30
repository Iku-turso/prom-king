import {
  dropDownMenu,
  getDropDownMenuItemsInjectableBunch,
  getDropDownMenuKind,
  useCloseDropDownMenu,
} from "@k8slens/drop-down-menu-contracts";
import { DropDownMenuItemRow, DropDownMenuSubMenu } from "@k8slens/drop-down-menu-items";
import { Div, Span } from "@k8slens/element-components";
import type { PanelDraft } from "../dashboards/dashboard";
import { type ExampleCategory, exampleCategories, type PanelExample } from "../dashboards/examples";
import { chartTypeIcons } from "./chart-type-icons";

/** What the examples menu is opened with: what to do with the example picked. */
export interface ExamplesMenuData {
  readonly onPick: (example: PanelDraft) => void;
}

/** The categories; hovering one opens its examples beside it. */
export const examplesMenuKind = getDropDownMenuKind<ExamplesMenuData>()("prom-king-examples-menu");

export const exampleCategoryMenuKind = getDropDownMenuKind<ExamplesMenuData & { readonly category: ExampleCategory }>()(
  "prom-king-example-category-menu",
);

const Category = ({ data, category }: { data: ExamplesMenuData; category: ExampleCategory }) => (
  <DropDownMenuSubMenu
    menu={dropDownMenu(exampleCategoryMenuKind, {
      data: { ...data, category },
      openOn: "hover",
      position: "right span-bottom",
    })}
  >
    <Span $flex={{ direction: "horizontal", gap: "xs", verticalAlign: "center" }}>
      {category.label}
      <Span $color="textMuted" $font={{ size: "xs" }}>
        {category.examples.length}
      </Span>
    </Span>
  </DropDownMenuSubMenu>
);

export const examplesMenuItemsBunch = getDropDownMenuItemsInjectableBunch({
  id: "prom-king-examples-menu-items",
  kind: examplesMenuKind,
  instantiate: () => () =>
    exampleCategories.map((category, index) => ({
      id: `category-${category.id}`,
      orderNumber: index,
      Component: Category,
      componentProps: { category },
    })),
});

const Example = ({ data, example }: { data: ExamplesMenuData; example: PanelExample }) => {
  const close = useCloseDropDownMenu();
  const { description, ...draft } = example;
  const Icon = chartTypeIcons[example.chartType];

  return (
    <DropDownMenuItemRow
      Icon={Icon}
      $tooltip={{ contentText: description, position: "right" }}
      $onClick={() => {
        data.onPick(draft);
        close();
      }}
    >
      <Div $style={{ maxWidth: "calc(var(--unit) * 80)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {example.title}
      </Div>
    </DropDownMenuItemRow>
  );
};

export const exampleCategoryMenuItemsBunch = getDropDownMenuItemsInjectableBunch({
  id: "prom-king-example-category-menu-items",
  kind: exampleCategoryMenuKind,
  instantiate: () => (data) =>
    data.category.examples.map((example, index) => ({
      id: `example-${data.category.id}-${index}`,
      orderNumber: index,
      Component: Example,
      componentProps: { example },
    })),
});
