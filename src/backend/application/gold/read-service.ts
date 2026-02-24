import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { GoldReadModel, WeekGroceriesResponse, WeekSummaryResponse } from "./types";

const keyFromWeek = (year: number, week: number, kcal: number, basePersons: number): string =>
  `${year}:${week}:${kcal}:${basePersons}`;

export class GoldWeekReadService {
  private readonly store = new Map<string, GoldReadModel>();

  private readonly stateStore?: PersistentStateStore;

  constructor(options?: { stateStore?: PersistentStateStore }) {
    this.stateStore = options?.stateStore;
    if (this.stateStore) {
      const persisted = this.stateStore.read().goldReadModels;
      for (const [key, model] of Object.entries(persisted)) {
        this.store.set(key, model);
      }
    }
  }

  upsert(model: GoldReadModel): void {
    const key = keyFromWeek(
      model.weekPlan.year,
      model.weekPlan.week,
      model.weekPlan.kcal,
      model.weekPlan.basePersons,
    );
    this.store.set(key, model);
    this.stateStore?.update((draft) => {
      draft.goldReadModels[key] = structuredClone(model);
    });
  }

  getSummary(year: number, week: number, kcal: number, basePersons: number): WeekSummaryResponse | null {
    const key = keyFromWeek(year, week, kcal, basePersons);
    const model = this.store.get(key);
    if (!model) {
      return null;
    }

    return {
      weekPlan: model.weekPlan,
      matchStatus: model.matchStatus,
      cartPlan: model.cartPlan,
    };
  }

  getGroceries(year: number, week: number, kcal: number, basePersons: number): WeekGroceriesResponse | null {
    const key = keyFromWeek(year, week, kcal, basePersons);
    const model = this.store.get(key);
    if (!model) {
      return null;
    }

    return {
      weekPlanId: model.weekPlan.weekPlanId,
      groceries: model.groceries,
      reconcile: model.groceryReconcile,
    };
  }
}
