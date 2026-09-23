import type { ID, Timestamps, TenantScoped } from "./shared";
import type { AlertSeverity } from "./operations";

export interface Notification extends Timestamps, TenantScoped {
  id: ID;
  severity: AlertSeverity;
  title: string;
  detail: string;
  read: boolean;
  linkPath: string | null;
  category: "campaign" | "creative" | "inventory" | "operations" | "finance" | "system";
}
