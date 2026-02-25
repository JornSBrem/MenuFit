import assert from "node:assert/strict";
import test from "node:test";

import type { AdminAsyncViewState, AdminDataViewData } from "../types.ts";
import {
  renderDataTab,
  validateRecipeFormInput,
  validateWeekMenuFormInput,
  validateMappingOverrideFormInput,
  type RecipeFormState,
  type WeekMenuFormState,
  type MappingOverrideFormState,
} from "./data-renderer.ts";

// --- Helpers ---

const emptyView = (): AdminAsyncViewState<AdminDataViewData> => ({
  status: "empty",
  data: {
    diagnostics: { generatedAt: "t", totalJobs: 0, runningJobs: 0, completedJobs: 0, failedJobs: 0, reportsGenerated: 0 },
    recipes: [],
    weekMenus: [],
    mappingOverrides: [],
  },
});

const successView = (): AdminAsyncViewState<AdminDataViewData> => ({
  status: "success",
  data: {
    diagnostics: { generatedAt: "t", totalJobs: 1, runningJobs: 0, completedJobs: 1, failedJobs: 0, reportsGenerated: 1 },
    recipes: [
      { recipeId: "r-1", title: "Pasta Bolognese", slug: "pasta", visibility: "household", tags: ["italian"], updatedAt: "2026-02-25T10:00:00.000Z", updatedBy: "admin-1" },
    ],
    weekMenus: [
      { weekMenuId: "wm-1", householdId: "hh-1", week: 8, kcal: 2000, basePersons: 4, mealCount: 5, updatedAt: "2026-02-25T10:00:00.000Z", updatedBy: "admin-1" },
    ],
    mappingOverrides: [
      { overrideId: "ov-1", sourceKey: "tomato", targetKey: "tomaat", updatedAt: "2026-02-25T10:00:00.000Z", updatedBy: "admin-1" },
    ],
  },
});

const loadingView = (): AdminAsyncViewState<AdminDataViewData> => ({
  status: "loading",
});

const errorView = (): AdminAsyncViewState<AdminDataViewData> => ({
  status: "error",
  error: { code: "API_ERROR", message: "Could not load data.", hint: "Try again." },
});

// ---------------------------------------------------------------------------
// renderDataTab
// ---------------------------------------------------------------------------

test("renderDataTab loading state shows loading indicator", () => {
  const html = renderDataTab(loadingView());
  assert.ok(html.includes("data-tab--loading"));
  assert.ok(html.includes("aria-busy=\"true\""));
  assert.ok(html.includes("Laden"));
});

test("renderDataTab error state without data shows error section", () => {
  const html = renderDataTab(errorView());
  assert.ok(html.includes("data-tab--error"));
  assert.ok(html.includes("API_ERROR"));
  assert.ok(html.includes("Could not load data."));
  assert.ok(html.includes("Try again."));
});

test("renderDataTab empty state shows all three empty messages and forms", () => {
  const html = renderDataTab(emptyView());
  assert.ok(html.includes("Nog geen recepten beschikbaar."));
  assert.ok(html.includes("Nog geen weekmenu"));
  assert.ok(html.includes("Nog geen mapping overrides"));
  assert.ok(html.includes("recipe-upsert-form"));
  assert.ok(html.includes("weekmenu-upsert-form"));
  assert.ok(html.includes("override-upsert-form"));
});

test("renderDataTab success state shows all three data sections", () => {
  const html = renderDataTab(successView());
  assert.ok(html.includes("data-section--recipes"));
  assert.ok(html.includes("data-section--weekmenus"));
  assert.ok(html.includes("data-section--overrides"));
});

// --- Recipes ---

test("renderDataTab shows recipe table with data", () => {
  const html = renderDataTab(successView());
  assert.ok(html.includes("recipes-table"));
  assert.ok(html.includes("Pasta Bolognese"));
  assert.ok(html.includes("pasta"));
  assert.ok(html.includes("household"));
  assert.ok(html.includes("italian"));
});

test("renderDataTab recipe rows have delete button with data-action", () => {
  const html = renderDataTab(successView());
  assert.ok(html.includes('data-action="deleteRecipe"'));
  assert.ok(html.includes('data-recipe-id="r-1"'));
});

test("renderDataTab recipe form shows validation error", () => {
  const html = renderDataTab(emptyView(), {
    recipeForm: { recipeId: "", slug: "", title: "", visibility: "", prepMinutes: "", tags: "", validationError: "Titel is verplicht." },
  });
  assert.ok(html.includes("recipe-form-error"));
  assert.ok(html.includes("Titel is verplicht."));
});

test("renderDataTab recipe form shows confirmation after save", () => {
  const html = renderDataTab(emptyView(), {
    recipeForm: { recipeId: "r-1", slug: "pasta", title: "Pasta", visibility: "household", prepMinutes: "", tags: "", confirmedId: "r-1" },
  });
  assert.ok(html.includes("recipe-form-confirmation"));
  assert.ok(html.includes("succesvol opgeslagen"));
});

test("renderDataTab recipe form pre-fills edit values", () => {
  const html = renderDataTab(emptyView(), {
    recipeForm: { recipeId: "r-1", slug: "pasta", title: "Pasta Bolognese", visibility: "household", prepMinutes: "30", tags: "italian,pasta" },
  });
  assert.ok(html.includes('value="r-1"'));
  assert.ok(html.includes('value="Pasta Bolognese"'));
  assert.ok(html.includes('value="30"'));
  assert.ok(html.includes('value="italian,pasta"'));
});

// --- WeekMenus ---

test("renderDataTab shows weekmenu table with data", () => {
  const html = renderDataTab(successView());
  assert.ok(html.includes("weekmenus-table"));
  assert.ok(html.includes("hh-1"));
  assert.ok(html.includes("2000"));
});

test("renderDataTab weekmenu rows have delete button with data-action", () => {
  const html = renderDataTab(successView());
  assert.ok(html.includes('data-action="deleteWeekMenu"'));
  assert.ok(html.includes('data-weekmenu-id="wm-1"'));
});

test("renderDataTab weekmenu form shows validation error", () => {
  const html = renderDataTab(emptyView(), {
    weekMenuForm: { weekMenuId: "", householdId: "", week: "", kcal: "", basePersons: "", mealCount: "", validationError: "Week is verplicht." },
  });
  assert.ok(html.includes("weekmenu-form-error"));
  assert.ok(html.includes("Week is verplicht."));
});

// --- MappingOverrides ---

test("renderDataTab shows mapping overrides table with data", () => {
  const html = renderDataTab(successView());
  assert.ok(html.includes("overrides-table"));
  assert.ok(html.includes("tomato"));
  assert.ok(html.includes("tomaat"));
});

test("renderDataTab override rows have delete button with data-action", () => {
  const html = renderDataTab(successView());
  assert.ok(html.includes('data-action="deleteMappingOverride"'));
  assert.ok(html.includes('data-override-id="ov-1"'));
});

test("renderDataTab override form shows validation error", () => {
  const html = renderDataTab(emptyView(), {
    mappingOverrideForm: { overrideId: "", sourceKey: "", targetKey: "", note: "", validationError: "Bronsleutel is verplicht." },
  });
  assert.ok(html.includes("override-form-error"));
  assert.ok(html.includes("Bronsleutel is verplicht."));
});

test("renderDataTab override form shows confirmation after save", () => {
  const html = renderDataTab(emptyView(), {
    mappingOverrideForm: { overrideId: "ov-1", sourceKey: "a", targetKey: "b", note: "", confirmedId: "ov-1" },
  });
  assert.ok(html.includes("override-form-confirmation"));
  assert.ok(html.includes("succesvol opgeslagen"));
});

// --- XSS escaping ---

test("renderDataTab escapes XSS in recipe title", () => {
  const view: AdminAsyncViewState<AdminDataViewData> = {
    status: "success",
    data: {
      diagnostics: { generatedAt: "t", totalJobs: 0, runningJobs: 0, completedJobs: 0, failedJobs: 0, reportsGenerated: 0 },
      recipes: [{ recipeId: "r-x", title: '<script>xss</script>', slug: "s", visibility: "private", tags: [], updatedAt: "t", updatedBy: "u" }],
      weekMenus: [],
      mappingOverrides: [],
    },
  };
  const html = renderDataTab(view);
  assert.ok(!html.includes("<script>"), "raw script must not appear");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("renderDataTab escapes XSS in mapping override source key form field", () => {
  const html = renderDataTab(emptyView(), {
    mappingOverrideForm: { overrideId: "", sourceKey: '"onmouseover="alert(1)', targetKey: "t", note: "" },
  });
  assert.ok(!html.includes('"onmouseover='), "unescaped attribute injection must not appear");
  assert.ok(html.includes("&quot;onmouseover="));
});

// ---------------------------------------------------------------------------
// validateRecipeFormInput
// ---------------------------------------------------------------------------

test("validateRecipeFormInput returns error for empty title", () => {
  const f: RecipeFormState = { recipeId: "", slug: "s", title: "", visibility: "household", prepMinutes: "", tags: "" };
  assert.equal(validateRecipeFormInput(f), "Titel is verplicht.");
});

test("validateRecipeFormInput returns error for empty slug", () => {
  const f: RecipeFormState = { recipeId: "", slug: "", title: "T", visibility: "household", prepMinutes: "", tags: "" };
  assert.equal(validateRecipeFormInput(f), "Slug is verplicht.");
});

test("validateRecipeFormInput returns error for invalid visibility", () => {
  const f: RecipeFormState = { recipeId: "", slug: "s", title: "T", visibility: "public", prepMinutes: "", tags: "" };
  assert.ok(validateRecipeFormInput(f)?.includes("Zichtbaarheid"));
});

test("validateRecipeFormInput returns error for negative prepMinutes", () => {
  const f: RecipeFormState = { recipeId: "", slug: "s", title: "T", visibility: "household", prepMinutes: "-5", tags: "" };
  assert.ok(validateRecipeFormInput(f)?.includes("Bereidingstijd"));
});

test("validateRecipeFormInput accepts valid recipe without prepMinutes", () => {
  const f: RecipeFormState = { recipeId: "", slug: "s", title: "T", visibility: "private", prepMinutes: "", tags: "" };
  assert.equal(validateRecipeFormInput(f), null);
});

test("validateRecipeFormInput accepts valid recipe with prepMinutes", () => {
  const f: RecipeFormState = { recipeId: "", slug: "s", title: "T", visibility: "shared", prepMinutes: "20", tags: "" };
  assert.equal(validateRecipeFormInput(f), null);
});

// ---------------------------------------------------------------------------
// validateWeekMenuFormInput
// ---------------------------------------------------------------------------

test("validateWeekMenuFormInput returns error for empty householdId", () => {
  const f: WeekMenuFormState = { weekMenuId: "", householdId: "", week: "8", kcal: "2000", basePersons: "4", mealCount: "5" };
  assert.equal(validateWeekMenuFormInput(f), "Huishouden-ID is verplicht.");
});

test("validateWeekMenuFormInput returns error for week out of range", () => {
  const f: WeekMenuFormState = { weekMenuId: "", householdId: "h", week: "99", kcal: "2000", basePersons: "4", mealCount: "5" };
  assert.ok(validateWeekMenuFormInput(f)?.includes("Week"));
});

test("validateWeekMenuFormInput returns error for non-positive kcal", () => {
  const f: WeekMenuFormState = { weekMenuId: "", householdId: "h", week: "8", kcal: "0", basePersons: "4", mealCount: "5" };
  assert.ok(validateWeekMenuFormInput(f)?.includes("Kcal"));
});

test("validateWeekMenuFormInput accepts valid weekmenu", () => {
  const f: WeekMenuFormState = { weekMenuId: "", householdId: "h", week: "8", kcal: "2000", basePersons: "4", mealCount: "5" };
  assert.equal(validateWeekMenuFormInput(f), null);
});

// ---------------------------------------------------------------------------
// validateMappingOverrideFormInput
// ---------------------------------------------------------------------------

test("validateMappingOverrideFormInput returns error for empty sourceKey", () => {
  const f: MappingOverrideFormState = { overrideId: "", sourceKey: "", targetKey: "t", note: "" };
  assert.equal(validateMappingOverrideFormInput(f), "Bronsleutel is verplicht.");
});

test("validateMappingOverrideFormInput returns error for empty targetKey", () => {
  const f: MappingOverrideFormState = { overrideId: "", sourceKey: "s", targetKey: "", note: "" };
  assert.equal(validateMappingOverrideFormInput(f), "Doelsleutel is verplicht.");
});

test("validateMappingOverrideFormInput accepts valid override", () => {
  const f: MappingOverrideFormState = { overrideId: "", sourceKey: "tomato", targetKey: "tomaat", note: "" };
  assert.equal(validateMappingOverrideFormInput(f), null);
});
