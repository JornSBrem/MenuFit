export type CartSyncMode = "execute" | "dry-run";
export type CartSyncSource = "user" | "admin";
export type CartSyncStatus = "synced" | "failed" | "dry_run";

export interface CartSyncItem {
  itemId: string;
  quantity: number;
  unit?: string;
}

export interface CartSyncRequest {
  idempotencyKey: string;
  weekPlanId: string;
  householdId: string;
  source: CartSyncSource;
  mode?: CartSyncMode;
  items: CartSyncItem[];
}

export interface CartSyncReport {
  reportId: string;
  idempotencyKey: string;
  weekPlanId: string;
  householdId: string;
  source: CartSyncSource;
  mode: CartSyncMode;
  status: CartSyncStatus;
  itemCount: number;
  syncedCount: number;
  failedCount: number;
  idempotentReplay: boolean;
  message: string;
  externalCartId?: string;
  errors?: string[];
  createdAt: string;
}

export interface CartSyncValidationErrorPayload {
  code: string;
  message: string;
  hint?: string;
}
