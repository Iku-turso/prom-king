import { dropDownMenu, getDropDownMenuItemsInjectableBunch, getDropDownMenuKind, useCloseDropDownMenu } from "@k8slens/drop-down-menu-contracts";
import { DropDownMenuItemRow } from "@k8slens/drop-down-menu-items";
import { Span, type SpanProps } from "@k8slens/element-components";
import { FolderIcon, LayersIcon, NodesIcon, PodsIcon, StorageIcon, WorkloadsIcon } from "@k8slens/icon";
import { useInject } from "@k8slens/use-inject";
import { openResourceInjectionToken } from "./open-resource.injectable";
import { linkKey, linkLabel, type ResourceLink, type ResourceType, resourceTypeLabels } from "./resource-links";
import styles from "./series-name.module.scss";

export const resourceIcons: Record<ResourceType, typeof PodsIcon> = {
  pod: PodsIcon,
  deployment: WorkloadsIcon,
  statefulset: WorkloadsIcon,
  daemonset: WorkloadsIcon,
  job: WorkloadsIcon,
  persistentvolumeclaim: StorageIcon,
  persistentvolume: StorageIcon,
  node: NodesIcon,
  namespace: FolderIcon,
};

interface ResourceLinksMenuData {
  readonly clusterId: string;
  readonly links: readonly ResourceLink[];
}

/** The resources a series names, to pick which one's details to open. */
export const resourceLinksMenuKind = getDropDownMenuKind<ResourceLinksMenuData>()("prom-king-resource-links-menu");

const ResourceLinkRow = ({ data, link }: { data: ResourceLinksMenuData; link: ResourceLink }) => {
  const openResource = useInject(openResourceInjectionToken)();
  const close = useCloseDropDownMenu();

  return (
    <DropDownMenuItemRow
      Icon={resourceIcons[link.type]}
      $onClick={() => {
        close();
        void openResource(data.clusterId, link);
      }}
      trailing={
        <Span $color="textMuted" $font={{ size: "xs" }}>
          {resourceTypeLabels[link.type]}
        </Span>
      }
    >
      {link.namespace ? `${link.namespace}/${link.name}` : link.name}
    </DropDownMenuItemRow>
  );
};

const Heading = () => (
  <DropDownMenuItemRow Icon={LayersIcon} $color="textMuted" $enabled={false}>
    Open details of
  </DropDownMenuItemRow>
);

export const resourceLinksMenuItemsBunch = getDropDownMenuItemsInjectableBunch({
  id: "prom-king-resource-links-menu-items",
  kind: resourceLinksMenuKind,
  instantiate: () => (data) => [
    { id: "heading", orderNumber: 0, Component: Heading, componentProps: {} },
    ...data.links.map((link, index) => ({
      id: `link-${linkKey(link)}`,
      orderNumber: index + 1,
      Component: ResourceLinkRow,
      componentProps: { link },
    })),
  ],
});

export interface SeriesNameProps extends SpanProps {
  readonly clusterId: string;
  readonly links: readonly ResourceLink[];
}

/**
 * A series' name that opens what it is about: the one resource it names straight away, a menu of
 * them when it names several, and nothing when it names none.
 */
export const SeriesName = ({ clusterId, links, children, $className, ...rest }: SeriesNameProps) => {
  const openResource = useInject(openResourceInjectionToken)();

  if (links.length === 0) {
    return (
      <Span $className={$className} {...rest}>
        {children}
      </Span>
    );
  }

  const only = links.length === 1 ? links[0]! : undefined;

  return (
    <Span
      $anchor
      $className={[styles.link, $className]}
      $tooltip={only ? `Open ${linkLabel(only)}` : `Open the details of one of ${links.length} resources`}
      {...(only
        ? { $onClick: () => void openResource(clusterId, only) }
        : { $dropDownMenu: dropDownMenu(resourceLinksMenuKind, { data: { clusterId, links } }) })}
      {...rest}
    >
      {children}
    </Span>
  );
};
