import type { GoldReadModel, WeekGroceriesResponse, WeekSummaryResponse } from "./types";

const keyFromWeek = (year: number, week: number, kcal: number, basePersons: number): string =>
  `${year}:${week}:${kcal}:${basePersons}`;

export class GoldWeekReadService {
  private readonly store = new Map<string, GoldReadModel>();

  upsert(model: GoldReadModel): void {
    const key = keyFromWeek(
      model.weekPlan.year,
      model.weekPlan.week,
      model.weekPlan.kcal,
      model.weekPlan.basePersons,
    );
    this.store.set(key, model);
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
