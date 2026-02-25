import { useState, type FormEvent } from "react";
import type {
  AdminAsyncViewState,
  AdminDataViewData,
  AdminRecipeRecord,
  AdminWeekMenuRecord,
  AdminMappingOverrideRecord,
} from "@lib/types.ts";
import type { AdminDashboardController } from "@lib/admin-dashboard-controller.ts";
import { card, section, table, th, td, btn, btnDanger, emptyMsg, fieldset, label, input, select } from "./shared-styles.ts";

interface DataTabProps {
  viewState: AdminAsyncViewState<AdminDataViewData>;
  controller: AdminDashboardController;
  onStateChange: () => void;
}

function genId(): string {
  return crypto.randomUUID();
}

// ---- Recipes ----
function RecipesSection({
  recipes,
  controller,
  onStateChange,
}: {
  recipes: AdminRecipeRecord[];
  controller: AdminDashboardController;
  onStateChange: () => void;
}) {
  const [editing, setEditing] = useState<Partial<AdminRecipeRecord> | null>(null);
  const [busy, setBusy] = useState(false);

  const startNew = () =>
    setEditing({ recipeId: genId(), slug: "", title: "", visibility: "shared", tags: [] });
  const startEdit = (r: AdminRecipeRecord) => setEditing({ ...r });
  const cancel = () => setEditing(null);

  const handleDelete = async (recipeId: string) => {
    if (!confirm("Recept verwijderen?")) return;
    setBusy(true);
    await controller.deleteRecipe({ operationId: genId(), recipeId });
    onStateChange();
    setBusy(false);
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    await controller.upsertRecipe({
      operationId: genId(),
      recipe: {
        recipeId: editing.recipeId ?? genId(),
        slug: String(data.get("slug") ?? "").trim(),
        title: String(data.get("title") ?? "").trim(),
        visibility: (data.get("visibility") as AdminRecipeRecord["visibility"]) ?? "shared",
        prepMinutes: Number(data.get("prepMinutes")) || undefined,
        tags: String(data.get("tags") ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      },
    });
    onStateChange();
    setEditing(null);
    setBusy(false);
  };

  return (
    <div style={card}>
      <div style={section.header}>
        <h3 style={section.title}>Recepten ({recipes.length})</h3>
        <button style={btn} onClick={startNew} disabled={busy}>
          + Nieuw recept
        </button>
      </div>

      {editing && (
        <form onSubmit={(e) => void handleSave(e)} style={fieldset}>
          <div style={label}>Titel</div>
          <input style={input} name="title" defaultValue={editing.title ?? ""} required />
          <div style={label}>Slug</div>
          <input style={input} name="slug" defaultValue={editing.slug ?? ""} required />
          <div style={label}>Zichtbaarheid</div>
          <select style={select} name="visibility" defaultValue={editing.visibility ?? "shared"}>
            <option value="private">Privé</option>
            <option value="household">Gezin</option>
            <option value="shared">Gedeeld</option>
          </select>
          <div style={label}>Bereidingstijd (min)</div>
          <input style={input} name="prepMinutes" type="number" min={0} defaultValue={editing.prepMinutes ?? ""} />
          <div style={label}>Tags (kommagescheiden)</div>
          <input style={input} name="tags" defaultValue={(editing.tags ?? []).join(", ")} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={btn} type="submit" disabled={busy}>
              Opslaan
            </button>
            <button style={btnDanger} type="button" onClick={cancel} disabled={busy}>
              Annuleren
            </button>
          </div>
        </form>
      )}

      {recipes.length === 0 ? (
        <p style={emptyMsg}>Geen recepten gevonden.</p>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Titel</th>
              <th style={th}>Slug</th>
              <th style={th}>Zichtbaarheid</th>
              <th style={th}>Tags</th>
              <th style={th}>Bereid. (min)</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.recipeId}>
                <td style={td}>{r.title}</td>
                <td style={td}>{r.slug}</td>
                <td style={td}>{r.visibility}</td>
                <td style={td}>{r.tags.join(", ") || "—"}</td>
                <td style={td}>{r.prepMinutes ?? "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" as const }}>
                  <button style={{ ...btn, marginRight: 4 }} onClick={() => startEdit(r)} disabled={busy}>
                    Bewerken
                  </button>
                  <button style={btnDanger} onClick={() => void handleDelete(r.recipeId)} disabled={busy}>
                    Verwijderen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---- Week Menus ----
function WeekMenusSection({
  weekMenus,
  controller,
  onStateChange,
}: {
  weekMenus: AdminWeekMenuRecord[];
  controller: AdminDashboardController;
  onStateChange: () => void;
}) {
  const [editing, setEditing] = useState<Partial<AdminWeekMenuRecord> | null>(null);
  const [busy, setBusy] = useState(false);

  const startNew = () =>
    setEditing({ weekMenuId: genId(), householdId: "", week: 1, kcal: 2000, basePersons: 2, mealCount: 5 });
  const startEdit = (m: AdminWeekMenuRecord) => setEditing({ ...m });
  const cancel = () => setEditing(null);

  const handleDelete = async (weekMenuId: string) => {
    if (!confirm("Weekmenu verwijderen?")) return;
    setBusy(true);
    await controller.deleteWeekMenu({ operationId: genId(), weekMenuId });
    onStateChange();
    setBusy(false);
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const data = new FormData(e.currentTarget);
    await controller.upsertWeekMenu({
      operationId: genId(),
      weekMenu: {
        weekMenuId: editing.weekMenuId ?? genId(),
        householdId: String(data.get("householdId") ?? "").trim(),
        week: Number(data.get("week")),
        kcal: Number(data.get("kcal")),
        basePersons: Number(data.get("basePersons")),
        mealCount: Number(data.get("mealCount")),
      },
    });
    onStateChange();
    setEditing(null);
    setBusy(false);
  };

  return (
    <div style={card}>
      <div style={section.header}>
        <h3 style={section.title}>Weekmenu&apos;s ({weekMenus.length})</h3>
        <button style={btn} onClick={startNew} disabled={busy}>
          + Nieuw weekmenu
        </button>
      </div>

      {editing && (
        <form onSubmit={(e) => void handleSave(e)} style={fieldset}>
          <div style={label}>Household ID</div>
          <input style={input} name="householdId" defaultValue={editing.householdId ?? ""} required />
          <div style={label}>Week</div>
          <input style={input} name="week" type="number" min={1} max={52} defaultValue={editing.week ?? 1} required />
          <div style={label}>Kcal</div>
          <input style={input} name="kcal" type="number" min={1} defaultValue={editing.kcal ?? 2000} required />
          <div style={label}>Base Persons</div>
          <input style={input} name="basePersons" type="number" min={1} defaultValue={editing.basePersons ?? 2} required />
          <div style={label}>Meal Count</div>
          <input style={input} name="mealCount" type="number" min={1} defaultValue={editing.mealCount ?? 5} required />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={btn} type="submit" disabled={busy}>Opslaan</button>
            <button style={btnDanger} type="button" onClick={cancel} disabled={busy}>Annuleren</button>
          </div>
        </form>
      )}

      {weekMenus.length === 0 ? (
        <p style={emptyMsg}>Geen weekmenu&apos;s gevonden.</p>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Household</th>
              <th style={th}>Week</th>
              <th style={th}>Kcal</th>
              <th style={th}>Personen</th>
              <th style={th}>Maaltijden</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {weekMenus.map((m) => (
              <tr key={m.weekMenuId}>
                <td style={td}>{m.householdId}</td>
                <td style={td}>{m.week}</td>
                <td style={td}>{m.kcal}</td>
                <td style={td}>{m.basePersons}</td>
                <td style={td}>{m.mealCount}</td>
                <td style={{ ...td, whiteSpace: "nowrap" as const }}>
                  <button style={{ ...btn, marginRight: 4 }} onClick={() => startEdit(m)} disabled={busy}>Bewerken</button>
                  <button style={btnDanger} onClick={() => void handleDelete(m.weekMenuId)} disabled={busy}>Verwijderen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---- Mapping Overrides ----
function MappingOverridesSection({
  overrides,
  controller,
  onStateChange,
}: {
  overrides: AdminMappingOverrideRecord[];
  controller: AdminDashboardController;
  onStateChange: () => void;
}) {
  const [editing, setEditing] = useState<Partial<AdminMappingOverrideRecord> | null>(null);
  const [busy, setBusy] = useState(false);

  const startNew = () => setEditing({ overrideId: genId(), sourceKey: "", targetKey: "", note: "" });
  const startEdit = (o: AdminMappingOverrideRecord) => setEditing({ ...o });
  const cancel = () => setEditing(null);

  const handleDelete = async (overrideId: string) => {
    if (!confirm("Mapping override verwijderen?")) return;
    setBusy(true);
    await controller.deleteMappingOverride({ operationId: genId(), overrideId });
    onStateChange();
    setBusy(false);
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const data = new FormData(e.currentTarget);
    await controller.upsertMappingOverride({
      operationId: genId(),
      override: {
        overrideId: editing.overrideId ?? genId(),
        sourceKey: String(data.get("sourceKey") ?? "").trim(),
        targetKey: String(data.get("targetKey") ?? "").trim(),
        note: String(data.get("note") ?? "").trim() || undefined,
      },
    });
    onStateChange();
    setEditing(null);
    setBusy(false);
  };

  return (
    <div style={card}>
      <div style={section.header}>
        <h3 style={section.title}>Mapping Overrides ({overrides.length})</h3>
        <button style={btn} onClick={startNew} disabled={busy}>
          + Nieuwe override
        </button>
      </div>

      {editing && (
        <form onSubmit={(e) => void handleSave(e)} style={fieldset}>
          <div style={label}>Source Key</div>
          <input style={input} name="sourceKey" defaultValue={editing.sourceKey ?? ""} required />
          <div style={label}>Target Key</div>
          <input style={input} name="targetKey" defaultValue={editing.targetKey ?? ""} required />
          <div style={label}>Notitie</div>
          <input style={input} name="note" defaultValue={editing.note ?? ""} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={btn} type="submit" disabled={busy}>Opslaan</button>
            <button style={btnDanger} type="button" onClick={cancel} disabled={busy}>Annuleren</button>
          </div>
        </form>
      )}

      {overrides.length === 0 ? (
        <p style={emptyMsg}>Geen mapping overrides gevonden.</p>
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Source Key</th>
              <th style={th}>Target Key</th>
              <th style={th}>Notitie</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {overrides.map((o) => (
              <tr key={o.overrideId}>
                <td style={td}>{o.sourceKey}</td>
                <td style={td}>{o.targetKey}</td>
                <td style={td}>{o.note ?? "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" as const }}>
                  <button style={{ ...btn, marginRight: 4 }} onClick={() => startEdit(o)} disabled={busy}>Bewerken</button>
                  <button style={btnDanger} onClick={() => void handleDelete(o.overrideId)} disabled={busy}>Verwijderen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---- Main DataTab ----
export function DataTab({ viewState, controller, onStateChange }: DataTabProps) {
  const data = viewState.data;

  if (!data) {
    return <p style={emptyMsg}>Geen data geladen.</p>;
  }

  return (
    <div style={styles.stack}>
      {/* Diagnostics */}
      <div style={card}>
        <h3 style={section.title}>Systeem diagnostics</h3>
        <div style={styles.diagGrid}>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Totaal jobs</span>
            <span style={styles.diagValue}>{data.diagnostics.totalJobs}</span>
          </div>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Actief</span>
            <span style={styles.diagValue}>{data.diagnostics.runningJobs}</span>
          </div>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Afgerond</span>
            <span style={styles.diagValue}>{data.diagnostics.completedJobs}</span>
          </div>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Mislukt</span>
            <span style={{ ...styles.diagValue, color: data.diagnostics.failedJobs > 0 ? "#c00" : undefined }}>
              {data.diagnostics.failedJobs}
            </span>
          </div>
          <div style={styles.diagItem}>
            <span style={styles.diagLabel}>Reports</span>
            <span style={styles.diagValue}>{data.diagnostics.reportsGenerated}</span>
          </div>
        </div>
      </div>

      <RecipesSection recipes={data.recipes} controller={controller} onStateChange={onStateChange} />
      <WeekMenusSection weekMenus={data.weekMenus} controller={controller} onStateChange={onStateChange} />
      <MappingOverridesSection overrides={data.mappingOverrides} controller={controller} onStateChange={onStateChange} />
    </div>
  );
}

const styles = {
  stack: { display: "flex", flexDirection: "column" as const, gap: 24 },
  diagGrid: { display: "flex", gap: 24, flexWrap: "wrap" as const, marginTop: 8 },
  diagItem: { display: "flex", flexDirection: "column" as const, gap: 2 },
  diagLabel: { fontSize: 11, color: "#6e6e73", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  diagValue: { fontSize: 22, fontWeight: 700, color: "#1d1d1f" },
} as const;
