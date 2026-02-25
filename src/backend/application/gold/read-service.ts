import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { GoldReadModel, WeekGroceriesResponse, WeekSummaryResponse } from "./types";

const keyFromWeek = (year: number, week: number, kcal: number, basePersons: number): string =>
  `${year}:${week}:${kcal}:${basePersons}`;

const roundScaledQuantity = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

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
    const model = this.resolveModel(year, week, kcal, basePersons);
    if (!model) {
      return null;
    }

    return {
      weekPlan: model.weekPlan,
      meals: model.meals,
      matchStatus: model.matchStatus,
      cartPlan: model.cartPlan,
    };
  }

  getGroceries(year: number, week: number, kcal: number, basePersons: number): WeekGroceriesResponse | null {
    const model = this.resolveModel(year, week, kcal, basePersons);
    if (!model) {
      return null;
    }

    return {
      weekPlanId: model.weekPlan.weekPlanId,
      groceries: model.groceries,
      reconcile: model.groceryReconcile,
    };
  }

  private resolveModel(year: number, week: number, kcal: number, basePersons: number): GoldReadModel | null {
    const exact = this.store.get(keyFromWeek(year, week, kcal, basePersons));
    if (exact) {
      return exact;
    }

    const baseline = this.findClosestBaseline(year, week, basePersons, kcal);
    if (!baseline) {
      return null;
    }

    return this.deriveKcalProfile(baseline, kcal);
  }

  private findClosestBaseline(
    year: number,
    week: number,
    basePersons: number,
    targetKcal: number,
  ): GoldReadModel | null {
    const candidates = Array.from(this.store.values()).filter(
      (model) =>
        model.weekPlan.year === year &&
        model.weekPlan.week === week &&
        model.weekPlan.basePersons === basePersons,
    );
    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((left, right) => {
      const delta = Math.abs(left.weekPlan.kcal - targetKcal) - Math.abs(right.weekPlan.kcal - targetKcal);
      if (delta !== 0) {
        return delta;
      }
      return left.weekPlan.kcal - right.weekPlan.kcal;
    });

    return candidates[0] ?? null;
  }

  private deriveKcalProfile(source: GoldReadModel, targetKcal: number): GoldReadModel {
    if (source.weekPlan.kcal === targetKcal) {
      return source;
    }

    const ratio = source.weekPlan.kcal > 0 ? targetKcal / source.weekPlan.kcal : 1;
    const profileSuffix = `kcal-${targetKcal}`;

    return {
      ...source,
      weekPlan: {
        ...source.weekPlan,
        weekPlanId: `${source.weekPlan.weekPlanId}:${profileSuffix}`,
        kcal: targetKcal,
        transformVersion: `${source.weekPlan.transformVersion}+kcal-profile`,
      },
      groceries: source.groceries.map((item) => ({
        ...item,
        totalAmount:
          typeof item.totalAmount === "number" ? roundScaledQuantity(item.totalAmount * ratio) : item.totalAmount,
      })),
      cartPlan: {
        ...source.cartPlan,
        cartPlanId: `${source.cartPlan.cartPlanId}:${profileSuffix}`,
        weekPlanId: `${source.weekPlan.weekPlanId}:${profileSuffix}`,
      },
    };
  }
}
