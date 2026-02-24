export interface PicnicCartSyncItem {
  itemId: string;
  quantity: number;
  unit?: string;
}

export interface PicnicCartSyncRequest {
  householdId: string;
  weekPlanId: string;
  items: PicnicCartSyncItem[];
}

export interface PicnicCartSyncResult {
  syncedCount: number;
  failedCount: number;
  externalCartId?: string;
  errors?: string[];
}

export interface PicnicCartSyncAdapter {
  syncCart(request: PicnicCartSyncRequest): Promise<PicnicCartSyncResult>;
}

export class NoopPicnicCartSyncAdapter implements PicnicCartSyncAdapter {
  async syncCart(request: PicnicCartSyncRequest): Promise<PicnicCartSyncResult> {
    return {
      syncedCount: request.items.length,
      failedCount: 0,
      externalCartId: `noop-cart-${request.weekPlanId}`,
    };
  }
}
