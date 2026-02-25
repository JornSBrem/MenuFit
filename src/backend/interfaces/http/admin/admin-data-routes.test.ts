import assert from "node:assert/strict";
import test from "node:test";

import { AdminDataService } from "../../../application/admin/admin-data-service.ts";
import type { AdminSessionContext, UserSessionContext } from "../auth/session-context.ts";
import {
  handleDeleteMappingOverride,
  handleDeleteRecipe,
  handleDeleteWeekMenu,
  handleListMappingOverrides,
  handleListRecipes,
  handleListWeekMenus,
  handleUpsertMappingOverride,
  handleUpsertRecipe,
  handleUpsertWeekMenu,
} from "./admin-data-routes.ts";

const adminSession = (): AdminSessionContext => ({
  sessionKind: "admin",
  subjectId: "admin-1",
  tokenId: "tok-1",
  adminRole: "operator",
});

const userSession = (): UserSessionContext => ({
  sessionKind: "user",
  subjectId: "user-1",
  tokenId: "tok-1",
  picnicAccountId: "picnic-1",
});

const makeService = () =>
  new AdminDataService({ now: () => "2026-02-25T10:00:00.000Z" });

const recipeBody = () => ({
  operationId: "op-1",
  recipe: {
    recipeId: "r-1",
    slug: "pasta",
    title: "Pasta",
    visibility: "household" as const,
    tags: [],
  },
});

const weekMenuBody = () => ({
  operationId: "op-1",
  weekMenu: {
    weekMenuId: "wm-1",
    householdId: "hh-1",
    week: 8,
    kcal: 2000,
    basePersons: 4,
    mealCount: 5,
  },
});

const overrideBody = () => ({
  operationId: "op-1",
  override: {
    overrideId: "ov-1",
    sourceKey: "tomato",
    targetKey: "tomaat",
  },
});

// --- Auth checks ---

test("handleListRecipes rejects user session", () => {
  const result = handleListRecipes(makeService(), userSession());
  assert.ok(!result.ok);
  assert.equal(result.error?.code, "FORBIDDEN_SESSION");
});

test("handleUpsertRecipe rejects user session", () => {
  const result = handleUpsertRecipe(makeService(), userSession(), recipeBody());
  assert.ok(!result.ok);
  assert.equal(result.error?.code, "FORBIDDEN_SESSION");
});

// --- Recipe routes ---

test("handleListRecipes returns empty list initially", () => {
  const result = handleListRecipes(makeService(), adminSession());
  assert.ok(result.ok);
  assert.deepEqual(result.data, []);
});

test("handleUpsertRecipe creates recipe and handleListRecipes returns it", () => {
  const service = makeService();
  const upsert = handleUpsertRecipe(service, adminSession(), recipeBody());
  assert.ok(upsert.ok);
  assert.equal(upsert.data?.performedBy, "admin-1");

  const list = handleListRecipes(service, adminSession());
  assert.ok(list.ok);
  assert.equal(list.data?.length, 1);
  assert.equal(list.data![0]!.title, "Pasta");
});

test("handleDeleteRecipe removes recipe", () => {
  const service = makeService();
  handleUpsertRecipe(service, adminSession(), recipeBody());
  const del = handleDeleteRecipe(service, adminSession(), {
    operationId: "op-2",
    recipeId: "r-1",
  });
  assert.ok(del.ok);
  assert.equal(handleListRecipes(service, adminSession()).data?.length, 0);
});

test("handleUpsertRecipe rejects missing operationId", () => {
  const result = handleUpsertRecipe(makeService(), adminSession(), {
    ...recipeBody(),
    operationId: "",
  });
  assert.ok(!result.ok);
  assert.equal(result.error?.code, "INVALID_BODY");
});

test("handleDeleteRecipe rejects missing recipeId", () => {
  const result = handleDeleteRecipe(makeService(), adminSession(), {
    operationId: "op",
    recipeId: "",
  });
  assert.ok(!result.ok);
  assert.equal(result.error?.code, "INVALID_BODY");
});

// --- WeekMenu routes ---

test("handleListWeekMenus returns empty list initially", () => {
  const result = handleListWeekMenus(makeService(), adminSession());
  assert.ok(result.ok);
  assert.deepEqual(result.data, []);
});

test("handleUpsertWeekMenu and handleListWeekMenus", () => {
  const service = makeService();
  const upsert = handleUpsertWeekMenu(service, adminSession(), weekMenuBody());
  assert.ok(upsert.ok);

  const list = handleListWeekMenus(service, adminSession());
  assert.equal(list.data?.length, 1);
  assert.equal(list.data![0]!.week, 8);
});

test("handleDeleteWeekMenu removes weekMenu", () => {
  const service = makeService();
  handleUpsertWeekMenu(service, adminSession(), weekMenuBody());
  handleDeleteWeekMenu(service, adminSession(), { operationId: "op-2", weekMenuId: "wm-1" });
  assert.equal(handleListWeekMenus(service, adminSession()).data?.length, 0);
});

test("handleUpsertWeekMenu rejects invalid week", () => {
  const result = handleUpsertWeekMenu(makeService(), adminSession(), {
    operationId: "op",
    weekMenu: { ...weekMenuBody().weekMenu, week: 99 },
  });
  assert.ok(!result.ok);
  assert.equal(result.error?.code, "INVALID_INPUT");
});

// --- MappingOverride routes ---

test("handleListMappingOverrides returns empty list initially", () => {
  const result = handleListMappingOverrides(makeService(), adminSession());
  assert.ok(result.ok);
  assert.deepEqual(result.data, []);
});

test("handleUpsertMappingOverride and handleListMappingOverrides", () => {
  const service = makeService();
  const upsert = handleUpsertMappingOverride(service, adminSession(), overrideBody());
  assert.ok(upsert.ok);

  const list = handleListMappingOverrides(service, adminSession());
  assert.equal(list.data?.length, 1);
  assert.equal(list.data![0]!.sourceKey, "tomato");
});

test("handleDeleteMappingOverride removes override", () => {
  const service = makeService();
  handleUpsertMappingOverride(service, adminSession(), overrideBody());
  handleDeleteMappingOverride(service, adminSession(), { operationId: "op-2", overrideId: "ov-1" });
  assert.equal(handleListMappingOverrides(service, adminSession()).data?.length, 0);
});

test("handleDeleteMappingOverride rejects missing overrideId", () => {
  const result = handleDeleteMappingOverride(makeService(), adminSession(), {
    operationId: "op",
    overrideId: "",
  });
  assert.ok(!result.ok);
  assert.equal(result.error?.code, "INVALID_BODY");
});

test("handleListWeekMenus rejects user session", () => {
  const result = handleListWeekMenus(makeService(), userSession());
  assert.ok(!result.ok);
  assert.equal(result.error?.code, "FORBIDDEN_SESSION");
});
