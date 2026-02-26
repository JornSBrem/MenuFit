import type { RuntimeConfigStore } from "../../../shared/config/index.ts";
import { buildPgEndpointUrl } from "./endpoint-contract.ts";

export interface PgDiscoverOptions {
  /** Aantal weken terug vanaf nu om te proberen (default: 2) */
  weeksBack?: number;
  /** Aantal weken vooruit vanaf nu om te proberen (default: 8) */
  weeksForward?: number;
}

export interface PgDiscoverResult {
  availableWeeks: number[];
  probedWeeks: number[];
  errors: Array<{ week: number; error: string }>;
}

/**
 * Zet een datum om naar het YYYYWW ISO-weeknummer dat de PG API gebruikt.
 * Bijv.: week 9 van 2026 → 202609
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
 * Genereert de lijst van ISO-weeknummers in een bereik rondom vandaag.
 */
export const buildProbeWeeks = (options: PgDiscoverOptions = {}): number[] => {
  const weeksBack = options.weeksBack ?? 2;
  const weeksForward = options.weeksForward ?? 8;
  const now = new Date();
  const weeks: number[] = [];

  for (let offset = -weeksBack; offset <= weeksForward; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset * 7);
    const weekNum = toIsoWeekNumber(d);
    if (!weeks.includes(weekNum)) {
      weeks.push(weekNum);
    }
  }

  return weeks.sort((a, b) => a - b);
};

const isValidWeekResponse = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (!p.data || typeof p.data !== "object") return false;
  const data = p.data as Record<string, unknown>;
  return Array.isArray(data.groceries) || Array.isArray(data.meals);
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

  const probedWeeks = buildProbeWeeks(options);
  const availableWeeks: number[] = [];
  const errors: Array<{ week: number; error: string }> = [];

  // Verwerk in batches van 5 parallelle requests
  const BATCH_SIZE = 5;
  for (let i = 0; i < probedWeeks.length; i += BATCH_SIZE) {
    const batch = probedWeeks.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (week) => {
        const url = buildPgEndpointUrl(config, "week", { week });
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json", ...extraHeaders },
          });

          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              errors.push({ week, error: `Auth fout (${response.status}) — log eerst in bij PG` });
            }
            // 404 / 400 → week bestaat gewoon niet, geen fout melden
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
  }

  availableWeeks.sort((a, b) => a - b);
  return { availableWeeks, probedWeeks, errors };
};
