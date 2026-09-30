import { getPersistableArrayInjectableBunch } from "@k8slens/persistable-contracts";
import type { Dashboard } from "./dashboard";

/** Every dashboard the user defined, on disk. Only the application window reads or writes it. */
export const dashboardsPersistableBunch = getPersistableArrayInjectableBunch<Dashboard>()({
  id: "dashboards",
});
