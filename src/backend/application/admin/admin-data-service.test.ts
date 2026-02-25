import assert from "node:assert/strict";
import test from "node:test";

import { AdminDataService, AdminDataValidationError } from "./admin-data-service.ts";

const makeService = () =>
  new AdminDataService({ now: () => "2026-02-25T10:00:00.000Z" });

const validRecipe = () => ({
  recipeId: "recipe-1",
  slug: "pasta-bolognese",
  title: "Pasta Bolognese",
  visibility: "household" as const,
  prepMinutes: 30,
  tags: ["pasta", "meat"],
});

const validWeekMenu = () => ({
  weekMenuId: "wm-1",
  householdId: "hh-1",
  week: 8,
  kcal: 2000,
  basePersons: 4,
  mealCount: 5,
});

const validOverride = () => ({
  overrideId: "override-1",
  sourceKey: "tomato-sauce",
  targetKey: "tomatensaus-picnic",
  note: "Verified match",
});

// --- Recipe tests ---

test("AdminDataService upsertRecipe stores and lists recipes", () => {
  const service = makeService();
  const report = service.upsertRecipe({
    operationId: "op-1",
    performedBy: "admin-1",
    recipe: validRecipe(),
  });

  assert.equal(report.operationId, "op-1");
  assert.equal(report.performedBy, "admin-1");
  assert.equal(report.status, "completed");

  const list = service.listRecipes();
  assert.equal(list.length, 1);
  assert.equal(list[0]!.title, "Pasta Bolognese");
  assert.equal(list[0]!.updatedBy, "admin-1");
});

test("AdminDataService upsertRecipe overwrites existing recipe", () => {
  const service = makeService();
  service.upsertRecipe({ operationId: "op-1", performedBy: "admin-1", recipe: validRecipe() });
  service.upsertRecipe({
    operationId: "op-2",
    performedBy: "admin-2",
    recipe: { ...validRecipe(), title: "Updated Title" },
  });

  const list = service.listRecipes();
  assert.equal(list.length, 1);
  assert.equal(list[0]!.title, "Updated Title");
  assert.equal(list[0]!.updatedBy, "admin-2");
});

test("AdminDataService deleteRecipe removes recipe", () => {
  const service = makeService();
  service.upsertRecipe({ operationId: "op-1", performedBy: "admin-1", recipe: validRecipe() });
  service.deleteRecipe({ operationId: "op-2", performedBy: "admin-1", recipeId: "recipe-1" });

  assert.equal(service.listRecipes().length, 0);
});

test("AdminDataService deleteRecipe is idempotent for non-existent recipe", () => {
  const service = makeService();
  const report = service.deleteRecipe({
    operationId: "op-1",
    performedBy: "admin-1",
    recipeId: "nonexistent",
  });
  assert.equal(report.status, "completed");
});

test("AdminDataService upsertRecipe rejects missing title", () => {
  const service = makeService();
  assert.throws(
    () =>
      service.upsertRecipe({
        operationId: "op",
        performedBy: "admin",
        recipe: { ...validRecipe(), title: "" },
      }),
    (err: unknown) => {
      assert.ok(err instanceof AdminDataValidationError);
      assert.equal(err.code, "INVALID_INPUT");
      return true;
    },
  );
});

test("AdminDataService upsertRecipe rejects invalid visibility", () => {
  const service = makeService();
  assert.throws(
    () =>
      service.upsertRecipe({
        operationId: "op",
        performedBy: "admin",
        recipe: { ...validRecipe(), visibility: "public" as never },
      }),
    (err: unknown) => {
      assert.ok(err instanceof AdminDataValidationError);
      return true;
    },
  );
});

test("AdminDataService upsertRecipe rejects negative prepMinutes", () => {
  const service = makeService();
  assert.throws(
    () =>
      service.upsertRecipe({
        operationId: "op",
        performedBy: "admin",
        recipe: { ...validRecipe(), prepMinutes: -5 },
      }),
    (err: unknown) => {
      assert.ok(err instanceof AdminDataValidationError);
      return true;
    },
  );
});

test("AdminDataService listRecipes returns sorted by title", () => {
  const service = makeService();
  service.upsertRecipe({
    operationId: "op-1",
    performedBy: "admin",
    recipe: { ...validRecipe(), recipeId: "r-2", title: "Zucchini Pasta" },
  });
  service.upsertRecipe({
    operationId: "op-2",
    performedBy: "admin",
    recipe: { ...validRecipe(), recipeId: "r-1", title: "Apple Crumble" },
  });

  const list = service.listRecipes();
  assert.equal(list[0]!.title, "Apple Crumble");
  assert.equal(list[1]!.title, "Zucchini Pasta");
});

// --- WeekMenu tests ---

test("AdminDataService upsertWeekMenu stores and lists weekMenus", () => {
  const service = makeService();
  service.upsertWeekMenu({ operationId: "op-1", performedBy: "admin-1", weekMenu: validWeekMenu() });

  const list = service.listWeekMenus();
  assert.equal(list.length, 1);
  assert.equal(list[0]!.week, 8);
});

test("AdminDataService deleteWeekMenu removes weekMenu", () => {
  const service = makeService();
  service.upsertWeekMenu({ operationId: "op-1", performedBy: "admin-1", weekMenu: validWeekMenu() });
  service.deleteWeekMenu({ operationId: "op-2", performedBy: "admin-1", weekMenuId: "wm-1" });

  assert.equal(service.listWeekMenus().length, 0);
});

test("AdminDataService upsertWeekMenu rejects invalid week", () => {
  const service = makeService();
  assert.throws(
    () =>
      service.upsertWeekMenu({
        operationId: "op",
        performedBy: "admin",
        weekMenu: { ...validWeekMenu(), week: 60 },
      }),
    (err: unknown) => {
      assert.ok(err instanceof AdminDataValidationError);
      return true;
    },
  );
});

test("AdminDataService upsertWeekMenu rejects zero kcal", () => {
  const service = makeService();
  assert.throws(
    () =>
      service.upsertWeekMenu({
        operationId: "op",
        performedBy: "admin",
        weekMenu: { ...validWeekMenu(), kcal: 0 },
      }),
    (err: unknown) => {
      assert.ok(err instanceof AdminDataValidationError);
      return true;
    },
  );
});

test("AdminDataService listWeekMenus sorted by week then householdId", () => {
  const service = makeService();
  service.upsertWeekMenu({
    operationId: "op-1",
    performedBy: "admin",
    weekMenu: { ...validWeekMenu(), weekMenuId: "wm-b", week: 10, householdId: "hh-1" },
  });
  service.upsertWeekMenu({
    operationId: "op-2",
    performedBy: "admin",
    weekMenu: { ...validWeekMenu(), weekMenuId: "wm-a", week: 8, householdId: "hh-2" },
  });

  const list = service.listWeekMenus();
  assert.equal(list[0]!.week, 8);
  assert.equal(list[1]!.week, 10);
});

// --- Mapping Override tests ---

test("AdminDataService upsertMappingOverride stores and lists overrides", () => {
  const service = makeService();
  service.upsertMappingOverride({ operationId: "op-1", performedBy: "admin-1", override: validOverride() });

  const list = service.listMappingOverrides();
  assert.equal(list.length, 1);
  assert.equal(list[0]!.sourceKey, "tomato-sauce");
});

test("AdminDataService deleteMappingOverride removes override", () => {
  const service = makeService();
  service.upsertMappingOverride({ operationId: "op-1", performedBy: "admin-1", override: validOverride() });
  service.deleteMappingOverride({ operationId: "op-2", performedBy: "admin-1", overrideId: "override-1" });

  assert.equal(service.listMappingOverrides().length, 0);
});

test("AdminDataService upsertMappingOverride rejects empty sourceKey", () => {
  const service = makeService();
  assert.throws(
    () =>
      service.upsertMappingOverride({
        operationId: "op",
        performedBy: "admin",
        override: { ...validOverride(), sourceKey: "" },
      }),
    (err: unknown) => {
      assert.ok(err instanceof AdminDataValidationError);
      return true;
    },
  );
});

test("AdminDataService listMappingOverrides sorted by sourceKey", () => {
  const service = makeService();
  service.upsertMappingOverride({
    operationId: "op-1",
    performedBy: "admin",
    override: { ...validOverride(), overrideId: "ov-b", sourceKey: "zucchini" },
  });
  service.upsertMappingOverride({
    operationId: "op-2",
    performedBy: "admin",
    override: { ...validOverride(), overrideId: "ov-a", sourceKey: "apple" },
  });

  const list = service.listMappingOverrides();
  assert.equal(list[0]!.sourceKey, "apple");
  assert.equal(list[1]!.sourceKey, "zucchini");
});
