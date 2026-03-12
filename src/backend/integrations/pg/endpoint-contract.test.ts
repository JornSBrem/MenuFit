import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPgResponseShape,
  buildPgEndpointUrl,
  getPgEndpointContract,
  isPgResponseShape,
  PG_ENDPOINT_DEFAULTS,
  PG_ENDPOINT_KEYS,
  PG_ENDPOINT_REQUIRED_PARAMS,
  renderPgEndpointTemplate,
  type PgEndpointKey,
} from "./endpoint-contract.ts";

type ContractConfigStub = {
  get<T = unknown>(key: string): T;
};

const createConfigStub = (
  overrides: Partial<Record<PgEndpointKey, string>> = {},
): ContractConfigStub => ({
  get<T = unknown>(key: string): T {
    const merged = {
      ...PG_ENDPOINT_DEFAULTS,
      ...overrides,
    } as Record<string, unknown>;
    return merged[key] as T;
  },
});

test("endpoint keys and required params match contract", () => {
  assert.deepEqual(PG_ENDPOINT_KEYS, {
    login: "PG_LOGIN_URL",
    week: "PG_WEEK_URL_TEMPLATE",
    day: "PG_DAY_URL_TEMPLATE",
    recipe: "PG_RECIPE_URL_TEMPLATE",
    shoppingList: "PG_SHOPPINGLIST_URL_TEMPLATE",
  });

  assert.deepEqual(PG_ENDPOINT_REQUIRED_PARAMS, {
    login: [],
    week: ["week"],
    day: ["dayId"],
    recipe: ["recipeId"],
    shoppingList: ["week"],
  });
});

test("buildPgEndpointUrl resolves all supported endpoint URLs", () => {
  const config = createConfigStub();

  assert.equal(
    buildPgEndpointUrl(config as never, "login"),
    "https://backend.projectgezond.nl/api/login",
  );
  assert.equal(
    buildPgEndpointUrl(config as never, "week", { week: 9 }),
    "https://backend.projectgezond.nl/api/week-menu/9",
  );
  assert.equal(
    buildPgEndpointUrl(config as never, "day", { dayId: 42 }),
    "https://backend.projectgezond.nl/api/v3/daymenus/42",
  );
  assert.equal(
    buildPgEndpointUrl(config as never, "recipe", { recipeId: "kipsate-bowl" }),
    "https://backend.projectgezond.nl/api/recipe/kipsate-bowl",
  );
  assert.equal(
    buildPgEndpointUrl(config as never, "shoppingList", { week: 9 }),
    "https://backend.projectgezond.nl/api/week-menu/9",
  );
});

test("renderPgEndpointTemplate throws for missing required variable", () => {
  assert.throws(
    () => renderPgEndpointTemplate("week", PG_ENDPOINT_DEFAULTS.PG_WEEK_URL_TEMPLATE),
    /Missing required template variable "week"/,
  );
});

test("renderPgEndpointTemplate throws when template leaves unresolved placeholders", () => {
  const config = createConfigStub({
    PG_WEEK_URL_TEMPLATE: "https://backend.projectgezond.nl/api/week-menu/{week}/{locale}",
  });

  assert.throws(
    () => buildPgEndpointUrl(config as never, "week", { week: 11 }),
    /Missing template variable "locale"/,
  );
});

test("getPgEndpointContract returns full endpoint metadata", () => {
  const config = createConfigStub({
    PG_RECIPE_URL_TEMPLATE: "https://example.invalid/recipes/{recipeId}",
  });

  const contract = getPgEndpointContract(config as never);
  assert.equal(contract.length, 5);

  const recipe = contract.find((entry) => entry.endpoint === "recipe");
  assert.ok(recipe);
  assert.equal(recipe.key, "PG_RECIPE_URL_TEMPLATE");
  assert.equal(recipe.configuredTemplate, "https://example.invalid/recipes/{recipeId}");
  assert.deepEqual(recipe.requiredParameters, ["recipeId"]);
});

test("assertPgResponseShape validates login/week/day/recipe/shoppingList", () => {
  assert.doesNotThrow(() => assertPgResponseShape("login", { token: "abc" }));
  assert.throws(() => assertPgResponseShape("login", []), /expected object/);

  assert.doesNotThrow(() =>
    assertPgResponseShape("week", {
      data: {
        groceries: [],
      },
    }),
  );
  assert.throws(() => assertPgResponseShape("week", { data: {} }), /data.groceries object or array/);

  assert.doesNotThrow(() =>
    assertPgResponseShape("week", {
      data: {
        groceries: { vegetables: "<p>tomaat</p>" },
      },
    }),
  );

  assert.doesNotThrow(() => assertPgResponseShape("day", { data: { meals: [] } }));
  assert.throws(() => assertPgResponseShape("day", { meals: [] }), /expected data object/);

  assert.doesNotThrow(() =>
    assertPgResponseShape("recipe", {
      data: {
        ingredients: [],
        steps: [],
      },
    }),
  );
  assert.throws(() => assertPgResponseShape("recipe", null), /expected object/);

  assert.doesNotThrow(() =>
    assertPgResponseShape("shoppingList", {
      data: {
        groceries: [{ id: 1 }],
      },
    }),
  );
  assert.throws(() => assertPgResponseShape("shoppingList", { data: [] }), /expected data object/);
});

test("isPgResponseShape returns boolean contract checks", () => {
  assert.equal(
    isPgResponseShape("week", {
      data: {
        groceries: [],
      },
    }),
    true,
  );
  assert.equal(isPgResponseShape("week", { data: {} }), false);
});
