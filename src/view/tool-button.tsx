import { Button, type ButtonProps } from "@k8slens/element-components";

/** An icon that is a control: the icon button look of the icon set, on an element-components button. */
export const ToolButton = ({ children, ...rest }: ButtonProps) => (
  <Button
    $interactive
    $padding="xxs"
    $border={{ radius: "s" }}
    $flex={{ direction: "horizontal", horizontalAlign: "center", verticalAlign: "center" }}
    $color="inherit"
    $backgroundColor="transparent"
    {...rest}
  >
    {children}
  </Button>
);
