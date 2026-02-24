import { CartSyncError, CartSyncService } from "../../../application/cart/sync-service.ts";
import type { CartSyncReport } from "../../../application/cart/types.ts";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface CartSyncBody {
  idempotencyKey: string;
  weekPlanId: string;
  householdId: string;
  source: "user" | "admin";
  mode?: "execute" | "dry-run";
  items: Array<{
    itemId: string;
    quantity: number;
    unit?: string;
  }>;
}

const invalidBody = (hint: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: "INVALID_BODY",
    message: "Request body is invalid.",
    hint,
  },
});

const serviceError = (error: CartSyncError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const validateBody = (body: CartSyncBody): string | null => {
  if (!body.idempotencyKey?.trim()) {
    return "idempotencyKey is required";
  }
  if (!body.weekPlanId?.trim()) {
    return "weekPlanId is required";
  }
  if (!body.householdId?.trim()) {
    return "householdId is required";
  }
  if (!["user", "admin"].includes(body.source)) {
    return "source must be either user or admin";
  }
  if (body.mode && !["execute", "dry-run"].includes(body.mode)) {
    return "mode must be execute or dry-run";
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "items must contain at least one item";
  }
  return null;
};

export const handleCartSync = async (
  service: CartSyncService,
  body: CartSyncBody,
): Promise<ApiEnvelope<CartSyncReport>> => {
  const validationError = validateBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  try {
    const report = await service.sync({
      idempotencyKey: body.idempotencyKey,
      weekPlanId: body.weekPlanId,
      householdId: body.householdId,
      source: body.source,
      mode: body.mode,
      items: body.items,
    });
    return { ok: true, data: report };
  } catch (error) {
    if (error instanceof CartSyncError) {
      return serviceError(error);
    }
    return {
      ok: false,
      error: {
        code: "SYNC_ERROR",
        message: "Unexpected cart sync failure.",
      },
    };
  }
};

export interface CartRouteHandlers {
  sync: (body: CartSyncBody) => Promise<ApiEnvelope<CartSyncReport>>;
}

export const createCartRouteHandlers = (service: CartSyncService): CartRouteHandlers => ({
  sync: (body) => handleCartSync(service, body),
});
