import { type SizePluginProps, tShirtSizeInPixels } from "@k8slens/element-components";
import type { ChartType } from "../dashboards/dashboard";

type ChartIcon = (props: SizePluginProps) => React.JSX.Element;

// Small drawings of each kind of chart, in the icon set's manner: one colour, the current one, at
// whatever size the row or button gives them.
const icon =
  (children: React.ReactNode): ChartIcon =>
  ({ $size }) => {
    const pixels = typeof $size === "string" && $size !== "full" ? tShirtSizeInPixels($size) : 18;

    return (
      <svg
        viewBox="0 0 24 24"
        width={pixels}
        height={pixels}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flex: "none" }}
        aria-hidden
      >
        {children}
      </svg>
    );
  };

export const chartTypeIcons: Record<ChartType, ChartIcon> = {
  line: icon(<path d="M3 17l5-6 4 3 8-9" />),
  area: icon(
    <>
      <path d="M3 19V14l5-4 4 2 9-6v13z" fill="currentColor" fillOpacity={0.3} />
      <path d="M3 14l5-4 4 2 9-6" />
    </>,
  ),
  "bar-gauge": icon(
    <>
      <path d="M4 6h14" />
      <path d="M4 12h10" />
      <path d="M4 18h6" />
    </>,
  ),
  stat: icon(
    <>
      <path d="M5 8h4v10" />
      <path d="M14 8h5l-4 10" />
    </>,
  ),
  gauge: icon(
    <>
      <path d="M4.5 17a8 8 0 1 1 15 0" />
      <path d="M12 13l4-4" />
    </>,
  ),
  donut: icon(
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5V12l6 4.5" />
    </>,
  ),
  table: icon(
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M3.5 10h17" />
      <path d="M3.5 14.5h17" />
      <path d="M10 10v9" />
    </>,
  ),
};
