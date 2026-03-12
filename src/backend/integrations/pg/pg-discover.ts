import type { RuntimeConfigStore } from "../../../shared/config/index.ts";
import { buildPgEndpointUrl } from "./endpoint-contract.ts";

export interface PgDiscoverOptions {
  /** Welk jaar te ontdekken (default: huidig jaar) */
  year?: number;
}

export interface PgDiscoverResult {
  availableWeeks: number[];
  probedWeeks: number[];
  errors: Array<{ week: number; error: string }>;
  /** Diagnostisch: geeft aan of PG auth headers geconfigureerd zijn */
  hasAuth: boolean;
  /** Diagnostisch: resultaat van eerste probe (voor debugging) */
  firstProbe?: { week: number; status: number; bodySnippet: string };
}

/**
 * Zet een datum om naar het YYYYWW interne weeknummer.
 * Bijv.: week 9 van 2026 → 202609
 * Let op: de PG API gebruikt alleen het weeknummer (% 100), niet YYYYWW.
 */
export const toIsoWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return d.getUTCFullYear() * 100 + weekNum;
};

/**
 * Genereert alle YYYYWW-weeknummers voor een heel jaar (weken 1 t/m 53).
 * Week 53 bestaat alleen in jaren met 53 ISO-weken; de PG API geeft 404 terug
 * als die week niet bestaat, zodat hij automatisch wordt overgeslagen.
 */
export const buildProbeWeeks = (options: PgDiscoverOptions = {}): number[] => {
  const year = options.year ?? new Date().getFullYear();
  const weeks: number[] = [];
  for (let w = 1; w <= 53; w++) {
    weeks.push(year * 100 + w);
  }
  return weeks;
};

const isValidWeekResponse = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  // PG API geeft { data: { ... } } terug voor een bestaande week
  return p.data !== undefined && p.data !== null;
};

/**
 * Probeert alle weeknummers in het bereik en geeft terug welke beschikbaar zijn
 * in de PG API (d.w.z. een geldig antwoord retourneren).
 *
 * Requests worden parallel verstuurd (max 5 tegelijk) om snel te zijn.
 */
export const discoverAvailableWeeks = async (
  config: RuntimeConfigStore,
  options: PgDiscoverOptions = {},
): Promise<PgDiscoverResult> => {
  const extraHeadersRaw = config.get("PG_EXTRA_HEADERS_JSON");
  const extraHeaders: Record<string, string> =
    extraHeadersRaw && typeof extraHeadersRaw === "object"
      ? (Object.fromEntries(
          Object.entries(extraHeadersRaw as Record<string, unknown>).filter(
            ([, v]) => typeof v === "string",
          ),
        ) as Record<string, string>)
      : {};

  const hasAuth = "Cookie" in extraHeaders || "Authorization" in extraHeaders;

  const probedWeeks = buildProbeWeeks(options);
  const availableWeeks: number[] = [];
  const errors: Array<{ week: number; error: string }> = [];
  let firstProbe: { week: number; status: number; bodySnippet: string } | undefined;

  // Verwerk in batches van 10 parallelle requests
  const BATCH_SIZE = 10;
  for (let i = 0; i < probedWeeks.length; i += BATCH_SIZE) {
    const batch = probedWeeks.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (week) => {
        // PG API verwacht alleen het weeknummer (bijv. 9), niet YYYYWW (bijv. 202609)
        const url = buildPgEndpointUrl(config, "week", { week: week % 100 });
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json", ...extraHeaders },
          });

          // Bewaar diagnostiek van de allereerste probe
          if (!firstProbe) {
            let bodySnippet = "";
            try {
              const clone = response.clone();
              const text = await clone.text();
              bodySnippet = text.slice(0, 200);
            } catch { /* ignore */ }
            firstProbe = { week, status: response.status, bodySnippet };
          }

          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              errors.push({ week, error: `Auth fout (${response.status}) — log eerst in bij PG` });
            }
            // 404 → week bestaat niet (normaal). Andere statuscodes: meld eerste keer.
            if (response.status !== 404 && response.status !== 401 && response.status !== 403) {
              // Meld onverwachte statuscodes alleen voor de eerste batch (voorkom spam)
              if (i === 0) {
                errors.push({ week, error: `Onverwacht HTTP ${response.status}` });
              }
            }
            return;
          }

          const payload = await response.json();
          if (isValidWeekResponse(payload)) {
            availableWeeks.push(week);
          }
        } catch (err) {
          errors.push({
            week,
            error: err instanceof Error ? err.message : "Netwerkfout",
          });
        }
      }),
    );

    // Als eerste batch al auth fouten geeft, stop meteen (geen 52 extra requests sturen)
    if (i === 0 && errors.some((e) => e.error.includes("Auth fout"))) {
      break;
    }
  }

  availableWeeks.sort((a, b) => a - b);
  return { availableWeeks, probedWeeks, errors, hasAuth, firstProbe };
};
