import { getFeature, registerInjectablesFromModules } from "@k8slens/feature-core";
import modulesWithInjectables from "./**/*.injectable.(ts|tsx)";
import stylesheets from "./**/!(_*).(scss|css)";

export const k8SlensCustomMetricsFeature = getFeature({
  id: "prom-king",
  register: (di) => {
    // Every `*.injectable.(ts|tsx)` under src, and every stylesheet, registered as it is added.
    registerInjectablesFromModules(di, [...modulesWithInjectables, ...stylesheets]);
  },
});
