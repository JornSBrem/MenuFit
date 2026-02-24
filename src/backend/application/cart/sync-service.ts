import {
  NoopPicnicCartSyncAdapter,
  type PicnicCartSyncAdapter,
} from "../../integrations/picnic/cart-sync.ts";
import type { CartSyncReport, CartSyncRequest } from "./types";

interface CartSyncServiceOptions {
  adapter?: PicnicCartSyncAdapter;
  now?: () => string;
}

export class CartSyncError extends Error {
  public readonly code: string;

  public readonly hint?: string;

  constructor(
    code: string,
    message: string,
    hint?: string,
  ) {
    super(message);
    this.name = "CartSyncError";
    this.code = code;
    this.hint = hint;
  }
}

const assertValidRequest = (request: CartSyncRequest): void => {
  if (!request.idempotencyKey.trim()) {
    throw new CartSyncError("INVALID_IDEMPOTENCY_KEY", "idempotencyKey is required.");
  }
  if (!request.weekPlanId.trim()) {
    throw new CartSyncError("INVALID_WEEK_PLAN", "weekPlanId is required.");
  }
  if (!request.householdId.trim()) {
    throw new CartSyncError("INVALID_HOUSEHOLD", "householdId is required.");
  }
  if (!Array.isArray(request.items) || request.items.length === 0) {
    throw new CartSyncError("EMPTY_ITEMS", "At least one cart item is required.");
  }
  for (const item of request.items) {
    if (!item.itemId.trim()) {
      throw new CartSyncError("INVALID_ITEM", "Each cart item requires an itemId.");
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new CartSyncError("INVALID_ITEM", "Each cart item requires quantity > 0.");
    }
  }
};

export class CartSyncService {
  private readonly reportsByIdempotencyKey = new Map<string, CartSyncReport>();

  private sequence = 0;

  private readonly adapter: PicnicCartSyncAdapter;

  private readonly now: () => string;

  constructor(options?: CartSyncServiceOptions) {
    this.adapter = options?.adapter ?? new NoopPicnicCartSyncAdapter();
    this.now = options?.now ?? (() => new Date().toISOString());
  }

  async sync(request: CartSyncRequest): Promise<CartSyncReport> {
    assertValidRequest(request);

    const mode = request.mode ?? "execute";
    if (mode === "dry-run" && request.source !== "admin") {
      throw new CartSyncError(
        "DRY_RUN_FORBIDDEN",
        "Dry-run is only available in admin/debug flow.",
        "Use mode=execute in user flow.",
      );
    }

    const existing = this.reportsByIdempotencyKey.get(request.idempotencyKey);
    if (existing) {
      return {
        ...existing,
        idempotentReplay: true,
      };
    }

    const createdAt = this.now();
    const reportId = this.nextReportId();
    const itemCount = request.items.length;

    if (mode === "dry-run") {
      const report: CartSyncReport = {
        reportId,
        idempotencyKey: request.idempotencyKey,
        weekPlanId: request.weekPlanId,
        householdId: request.householdId,
        source: request.source,
        mode,
        status: "dry_run",
        itemCount,
        syncedCount: 0,
        failedCount: 0,
        idempotentReplay: false,
        message: "Dry-run completed. No changes pushed to Picnic.",
        createdAt,
      };
      this.reportsByIdempotencyKey.set(request.idempotencyKey, report);
      return report;
    }

    const adapterResult = await this.adapter.syncCart({
      householdId: request.householdId,
      weekPlanId: request.weekPlanId,
      items: request.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unit: item.unit,
      })),
    });

    const status = adapterResult.failedCount > 0 ? "failed" : "synced";
    const report: CartSyncReport = {
      reportId,
      idempotencyKey: request.idempotencyKey,
      weekPlanId: request.weekPlanId,
      householdId: request.householdId,
      source: request.source,
      mode,
      status,
      itemCount,
      syncedCount: adapterResult.syncedCount,
      failedCount: adapterResult.failedCount,
      idempotentReplay: false,
      message:
        status === "synced"
          ? "Cart sync completed successfully."
          : "Cart sync completed with failures.",
      externalCartId: adapterResult.externalCartId,
      errors: adapterResult.errors,
      createdAt,
    };

    this.reportsByIdempotencyKey.set(request.idempotencyKey, report);
    return report;
  }

  getReport(idempotencyKey: string): CartSyncReport | null {
    return this.reportsByIdempotencyKey.get(idempotencyKey) ?? null;
  }

  private nextReportId(): string {
    this.sequence += 1;
    return `cart-sync-${this.sequence}`;
  }
}
