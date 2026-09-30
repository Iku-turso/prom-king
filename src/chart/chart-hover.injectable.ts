import { getInjectable2 } from "@k8slens/injectable";
import { action, observable } from "mobx";

/** Where the pointer is over a chart, as shares of its width and height. */
export interface HoverPoint {
  readonly x: number;
  readonly y: number;
}

/** Where the pointer is over one chart; one per chart, by the key it is shown under. */
export const chartHoverInjectable = getInjectable2({
  id: "prom-king-chart-hover",

  instantiate: () => (_chartKey: string) => {
    const at = observable.box<HoverPoint | undefined>(undefined, { deep: false });

    return {
      at,
      set: action((point: HoverPoint | undefined) => at.set(point)),
    };
  },
});
