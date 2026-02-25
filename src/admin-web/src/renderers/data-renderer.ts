/**
 * Data tab HTML renderer — framework-agnostic pure string output.
 *
 * Renders AdminAsyncViewState<AdminDataViewData> (and its sub-sections) as
 * HTML fragments that can be embedded in any shell.
 *
 * All user-supplied data is HTML-escaped. Interactive forms use data-action
 * attributes to let the host environment bind event handlers via controller.
 */
import type {
  AdminAsyncViewState,
  AdminDataViewData,
  AdminRecipeRecord,
  AdminWeekMenuRecord,
  AdminMappingOverrideRecord,
} from "../types.ts";

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

const esc = (value: unknown): string => {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const renderLoading = (label: string): string =>
  `<section class="data-tab data-tab--loading" aria-busy="true" aria-label="${esc(label)}">
  <p class="data-status-message">Laden…</p>
</section>`;

const renderError = (code: string, message: string, hint?: string): string =>
  `<section class="data-tab data-tab--error">
  <div class="data-error-banner" role="alert">
    <strong>Fout: ${esc(code)}</strong>
    <p>${esc(message)}${hint ? ` <span class="data-error-hint">(${esc(hint)})</span>` : ""}</p>
  </div>
</section>`;

// ---------------------------------------------------------------------------
// Recipe section
// ---------------------------------------------------------------------------

export interface RecipeFormState {
  recipeId: string;
  slug: string;
  title: string;
  visibility: string;
  prepMinutes: string;
  tags: string;
  validationError?: string;
  confirmedId?: string;
}

const renderRecipesTable = (recipes: AdminRecipeRecord[]): string => {
  if (recipes.length === 0) {
    return `<p class="recipes-empty-message">Nog geen recepten beschikbaar.</p>`;
  }

  const rows = recipes
    .map(
      (r) =>
        `<tr data-recipe-id="${esc(r.recipeId)}">
      <td>${esc(r.title)}</td>
      <td>${esc(r.slug)}</td>
      <td>${esc(r.visibility)}</td>
      <td>${r.prepMinutes !== undefined ? esc(r.prepMinutes) : "—"}</td>
      <td>${esc(r.tags.join(", ") || "—")}</td>
      <td>${esc(r.updatedBy)}</td>
      <td>${esc(r.updatedAt)}</td>
      <td>
        <button type="button" class="btn-delete" data-action="deleteRecipe" data-recipe-id="${esc(r.recipeId)}">Verwijder</button>
      </td>
    </tr>`,
    )
    .join("\n");

  return `<table class="recipes-table" aria-label="Recepten">
  <thead>
    <tr>
      <th scope="col">Titel</th>
      <th scope="col">Slug</th>
      <th scope="col">Zichtbaarheid</th>
      <th scope="col">Prep (min)</th>
      <th scope="col">Tags</th>
      <th scope="col">Gewijzigd door</th>
      <th scope="col">Gewijzigd op</th>
      <th scope="col">Acties</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
};

const renderRecipeForm = (formState?: RecipeFormState): string => {
  const f = formState ?? { recipeId: "", slug: "", title: "", visibility: "", prepMinutes: "", tags: "" };
  const isEdit = Boolean(f.recipeId);

  const visibilityOptions = ["private", "household", "shared"]
    .map((v) => `<option value="${v}"${f.visibility === v ? ' selected="selected"' : ""}>${esc(v)}</option>`)
    .join("");

  const errorBanner = f.validationError
    ? `<div class="recipe-form-error" role="alert" aria-live="assertive">${esc(f.validationError)}</div>`
    : "";

  const confirmBanner = f.confirmedId && !f.validationError
    ? `<div class="recipe-form-confirmation" role="status" aria-live="polite">Recept <strong>${esc(f.confirmedId)}</strong> succesvol opgeslagen.</div>`
    : "";

  return `<form class="recipe-upsert-form" data-action="upsertRecipe" novalidate>
  <fieldset>
    <legend>${isEdit ? "Recept bewerken" : "Nieuw recept toevoegen"}</legend>
    ${errorBanner}
    ${confirmBanner}
    <input type="hidden" name="recipeId" value="${esc(f.recipeId)}" />
    <div class="form-field">
      <label for="recipe-title">Titel <span aria-hidden="true">*</span></label>
      <input id="recipe-title" name="title" type="text" value="${esc(f.title)}" required />
    </div>
    <div class="form-field">
      <label for="recipe-slug">Slug <span aria-hidden="true">*</span></label>
      <input id="recipe-slug" name="slug" type="text" value="${esc(f.slug)}" required />
    </div>
    <div class="form-field">
      <label for="recipe-visibility">Zichtbaarheid <span aria-hidden="true">*</span></label>
      <select id="recipe-visibility" name="visibility" required>
        <option value="">— kies —</option>
        ${visibilityOptions}
      </select>
    </div>
    <div class="form-field">
      <label for="recipe-prep">Bereidingstijd (min)</label>
      <input id="recipe-prep" name="prepMinutes" type="number" min="0" value="${esc(f.prepMinutes)}" />
    </div>
    <div class="form-field">
      <label for="recipe-tags">Tags (komma-gescheiden)</label>
      <input id="recipe-tags" name="tags" type="text" value="${esc(f.tags)}" />
    </div>
    <button type="submit" class="btn-primary">${isEdit ? "Opslaan" : "Toevoegen"}</button>
  </fieldset>
</form>`;
};

// ---------------------------------------------------------------------------
// WeekMenu section
// ---------------------------------------------------------------------------

export interface WeekMenuFormState {
  weekMenuId: string;
  householdId: string;
  week: string;
  kcal: string;
  basePersons: string;
  mealCount: string;
  validationError?: string;
  confirmedId?: string;
}

const renderWeekMenusTable = (weekMenus: AdminWeekMenuRecord[]): string => {
  if (weekMenus.length === 0) {
    return `<p class="weekmenus-empty-message">Nog geen weekmenu's beschikbaar.</p>`;
  }

  const rows = weekMenus
    .map(
      (wm) =>
        `<tr data-weekmenu-id="${esc(wm.weekMenuId)}">
      <td>${esc(wm.week)}</td>
      <td>${esc(wm.householdId)}</td>
      <td>${esc(wm.kcal)}</td>
      <td>${esc(wm.basePersons)}</td>
      <td>${esc(wm.mealCount)}</td>
      <td>${esc(wm.updatedBy)}</td>
      <td>${esc(wm.updatedAt)}</td>
      <td>
        <button type="button" class="btn-delete" data-action="deleteWeekMenu" data-weekmenu-id="${esc(wm.weekMenuId)}">Verwijder</button>
      </td>
    </tr>`,
    )
    .join("\n");

  return `<table class="weekmenus-table" aria-label="Weekmenu&#39;s">
  <thead>
    <tr>
      <th scope="col">Week</th>
      <th scope="col">Huishouden</th>
      <th scope="col">Kcal</th>
      <th scope="col">Personen</th>
      <th scope="col">Maaltijden</th>
      <th scope="col">Gewijzigd door</th>
      <th scope="col">Gewijzigd op</th>
      <th scope="col">Acties</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
};

const renderWeekMenuForm = (formState?: WeekMenuFormState): string => {
  const f = formState ?? { weekMenuId: "", householdId: "", week: "", kcal: "", basePersons: "", mealCount: "" };
  const isEdit = Boolean(f.weekMenuId);

  const errorBanner = f.validationError
    ? `<div class="weekmenu-form-error" role="alert" aria-live="assertive">${esc(f.validationError)}</div>`
    : "";

  const confirmBanner = f.confirmedId && !f.validationError
    ? `<div class="weekmenu-form-confirmation" role="status" aria-live="polite">Weekmenu <strong>${esc(f.confirmedId)}</strong> succesvol opgeslagen.</div>`
    : "";

  return `<form class="weekmenu-upsert-form" data-action="upsertWeekMenu" novalidate>
  <fieldset>
    <legend>${isEdit ? "Weekmenu bewerken" : "Nieuw weekmenu toevoegen"}</legend>
    ${errorBanner}
    ${confirmBanner}
    <input type="hidden" name="weekMenuId" value="${esc(f.weekMenuId)}" />
    <div class="form-field">
      <label for="weekmenu-household">Huishouden-ID <span aria-hidden="true">*</span></label>
      <input id="weekmenu-household" name="householdId" type="text" value="${esc(f.householdId)}" required />
    </div>
    <div class="form-field">
      <label for="weekmenu-week">Week (1–53) <span aria-hidden="true">*</span></label>
      <input id="weekmenu-week" name="week" type="number" min="1" max="53" value="${esc(f.week)}" required />
    </div>
    <div class="form-field">
      <label for="weekmenu-kcal">Kcal <span aria-hidden="true">*</span></label>
      <input id="weekmenu-kcal" name="kcal" type="number" min="1" value="${esc(f.kcal)}" required />
    </div>
    <div class="form-field">
      <label for="weekmenu-persons">Basispersonen <span aria-hidden="true">*</span></label>
      <input id="weekmenu-persons" name="basePersons" type="number" min="1" value="${esc(f.basePersons)}" required />
    </div>
    <div class="form-field">
      <label for="weekmenu-meals">Maaltijden <span aria-hidden="true">*</span></label>
      <input id="weekmenu-meals" name="mealCount" type="number" min="1" value="${esc(f.mealCount)}" required />
    </div>
    <button type="submit" class="btn-primary">${isEdit ? "Opslaan" : "Toevoegen"}</button>
  </fieldset>
</form>`;
};

// ---------------------------------------------------------------------------
// MappingOverride section
// ---------------------------------------------------------------------------

export interface MappingOverrideFormState {
  overrideId: string;
  sourceKey: string;
  targetKey: string;
  note: string;
  validationError?: string;
  confirmedId?: string;
}

const renderMappingOverridesTable = (overrides: AdminMappingOverrideRecord[]): string => {
  if (overrides.length === 0) {
    return `<p class="overrides-empty-message">Nog geen mapping overrides beschikbaar.</p>`;
  }

  const rows = overrides
    .map(
      (o) =>
        `<tr data-override-id="${esc(o.overrideId)}">
      <td>${esc(o.sourceKey)}</td>
      <td>${esc(o.targetKey)}</td>
      <td>${esc(o.note ?? "—")}</td>
      <td>${esc(o.updatedBy)}</td>
      <td>${esc(o.updatedAt)}</td>
      <td>
        <button type="button" class="btn-delete" data-action="deleteMappingOverride" data-override-id="${esc(o.overrideId)}">Verwijder</button>
      </td>
    </tr>`,
    )
    .join("\n");

  return `<table class="overrides-table" aria-label="Mapping overrides">
  <thead>
    <tr>
      <th scope="col">Bronsleutel</th>
      <th scope="col">Doelsleutel</th>
      <th scope="col">Notitie</th>
      <th scope="col">Gewijzigd door</th>
      <th scope="col">Gewijzigd op</th>
      <th scope="col">Acties</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
};

const renderMappingOverrideForm = (formState?: MappingOverrideFormState): string => {
  const f = formState ?? { overrideId: "", sourceKey: "", targetKey: "", note: "" };
  const isEdit = Boolean(f.overrideId);

  const errorBanner = f.validationError
    ? `<div class="override-form-error" role="alert" aria-live="assertive">${esc(f.validationError)}</div>`
    : "";

  const confirmBanner = f.confirmedId && !f.validationError
    ? `<div class="override-form-confirmation" role="status" aria-live="polite">Override <strong>${esc(f.confirmedId)}</strong> succesvol opgeslagen.</div>`
    : "";

  return `<form class="override-upsert-form" data-action="upsertMappingOverride" novalidate>
  <fieldset>
    <legend>${isEdit ? "Mapping override bewerken" : "Nieuwe mapping override toevoegen"}</legend>
    ${errorBanner}
    ${confirmBanner}
    <input type="hidden" name="overrideId" value="${esc(f.overrideId)}" />
    <div class="form-field">
      <label for="override-source">Bronsleutel <span aria-hidden="true">*</span></label>
      <input id="override-source" name="sourceKey" type="text" value="${esc(f.sourceKey)}" required />
    </div>
    <div class="form-field">
      <label for="override-target">Doelsleutel <span aria-hidden="true">*</span></label>
      <input id="override-target" name="targetKey" type="text" value="${esc(f.targetKey)}" required />
    </div>
    <div class="form-field">
      <label for="override-note">Notitie</label>
      <input id="override-note" name="note" type="text" value="${esc(f.note)}" />
    </div>
    <button type="submit" class="btn-primary">${isEdit ? "Opslaan" : "Toevoegen"}</button>
  </fieldset>
</form>`;
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates recipe form input. Returns error message or null.
 */
export const validateRecipeFormInput = (f: RecipeFormState): string | null => {
  if (!f.title.trim()) {
    return "Titel is verplicht.";
  }
  if (!f.slug.trim()) {
    return "Slug is verplicht.";
  }
  if (!["private", "household", "shared"].includes(f.visibility)) {
    return "Zichtbaarheid moet 'private', 'household' of 'shared' zijn.";
  }
  if (f.prepMinutes !== "" && (!Number.isInteger(Number(f.prepMinutes)) || Number(f.prepMinutes) < 0)) {
    return "Bereidingstijd moet een niet-negatief geheel getal zijn.";
  }
  return null;
};

/**
 * Validates week menu form input. Returns error message or null.
 */
export const validateWeekMenuFormInput = (f: WeekMenuFormState): string | null => {
  if (!f.householdId.trim()) {
    return "Huishouden-ID is verplicht.";
  }
  const week = Number(f.week);
  if (!Number.isInteger(week) || week < 1 || week > 53) {
    return "Week moet een geheel getal tussen 1 en 53 zijn.";
  }
  const kcal = Number(f.kcal);
  if (!Number.isInteger(kcal) || kcal <= 0) {
    return "Kcal moet een positief geheel getal zijn.";
  }
  const basePersons = Number(f.basePersons);
  if (!Number.isInteger(basePersons) || basePersons <= 0) {
    return "Basispersonen moet een positief geheel getal zijn.";
  }
  const mealCount = Number(f.mealCount);
  if (!Number.isInteger(mealCount) || mealCount <= 0) {
    return "Maaltijden moet een positief geheel getal zijn.";
  }
  return null;
};

/**
 * Validates mapping override form input. Returns error message or null.
 */
export const validateMappingOverrideFormInput = (f: MappingOverrideFormState): string | null => {
  if (!f.sourceKey.trim()) {
    return "Bronsleutel is verplicht.";
  }
  if (!f.targetKey.trim()) {
    return "Doelsleutel is verplicht.";
  }
  return null;
};

// ---------------------------------------------------------------------------
// Top-level renderer
// ---------------------------------------------------------------------------

export interface RenderDataTabOptions {
  recipeForm?: RecipeFormState;
  weekMenuForm?: WeekMenuFormState;
  mappingOverrideForm?: MappingOverrideFormState;
}

/**
 * Renders the data management tab view as an HTML string.
 *
 * @param viewState - Current async view state for the data tab.
 * @param options   - Optional form states for each entity section.
 * @returns         - HTML fragment string ready for insertion.
 */
export const renderDataTab = (
  viewState: AdminAsyncViewState<AdminDataViewData>,
  options?: RenderDataTabOptions,
): string => {
  if (viewState.status === "loading") {
    return renderLoading("Data-beheer laden");
  }

  if (viewState.status === "error" && !viewState.data) {
    const error = viewState.error ?? { code: "UNKNOWN_ERROR", message: "Onbekende fout." };
    return renderError(error.code, error.message, error.hint);
  }

  const recipes = viewState.data?.recipes ?? [];
  const weekMenus = viewState.data?.weekMenus ?? [];
  const mappingOverrides = viewState.data?.mappingOverrides ?? [];

  const errorBanner =
    viewState.status === "error" && viewState.error
      ? `<div class="data-error-banner" role="alert">
    <strong>Fout: ${esc(viewState.error.code)}</strong>
    <p>${esc(viewState.error.message)}${viewState.error.hint ? ` <span class="data-error-hint">(${esc(viewState.error.hint)})</span>` : ""}</p>
  </div>`
      : "";

  return `<section class="data-tab">
  <h2 class="data-heading">Data-beheer</h2>
  ${errorBanner}

  <div class="data-section data-section--recipes">
    <h3>Recepten</h3>
    ${renderRecipesTable(recipes)}
    ${renderRecipeForm(options?.recipeForm)}
  </div>

  <div class="data-section data-section--weekmenus">
    <h3>Weekmenu&#39;s</h3>
    ${renderWeekMenusTable(weekMenus)}
    ${renderWeekMenuForm(options?.weekMenuForm)}
  </div>

  <div class="data-section data-section--overrides">
    <h3>Mapping overrides</h3>
    ${renderMappingOverridesTable(mappingOverrides)}
    ${renderMappingOverrideForm(options?.mappingOverrideForm)}
  </div>
</section>`;
};
