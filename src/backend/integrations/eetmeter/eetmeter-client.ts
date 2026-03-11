/**
 * Eetmeter API Client
 *
 * Verbindt met de interne Voedingscentrum Eetmeter API
 * (https://api3-mijn.voedingscentrum.nl/api/).
 *
 * De API is niet officieel gedocumenteerd; implementatie is gebaseerd op
 * reverse engineering van de Eetmeter mobiele app.
 */

const EETMETER_API_BASE = "https://api3-mijn.voedingscentrum.nl/api/";

const EETMETER_HEADERS: Record<string, string> = {
  Version: "4.6.0",
  Platform: "iOS",
  Accept: "application/json",
  "Content-Type": "application/json",
};

// ---- Periode namen (zelfde als in de app) -----------------------------------

export const PERIODE_NAMEN: Record<number, string> = {
  1: "Ontbijt",
  2: "Lunch",
  3: "Avondeten",
  4: "Tussendoor",
};

// ---- Foutklasse ------------------------------------------------------------

export class EetmeterClientError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "EetmeterClientError";
    this.code = code;
  }
}

// ---- Ruwe API-response types -----------------------------------------------

interface EetmeterLoginResponse {
  token?: string;
  // Het API kan ook een foutobject teruggeven
  Message?: string;
}

interface EetmeterDayResponse {
  startDate?: string;
  endDate?: string;
  items?: EetmeterConsumptieRaw[];
}

export interface EetmeterConsumptieRaw {
  id?: string;
  productName?: string;
  brandName?: string;
  amount?: number;
  unitName?: string;
  period?: number;
  energie?: number;
  eiwit?: number;
  vet?: number;
  koolhydraten?: number;
  vezels?: number;
  consumptionDate?: string;
  active?: boolean;
}

// ---- Genormaliseerde output types ------------------------------------------

export interface EetmeterConsumptie {
  id: string;
  productNaam: string;
  merkNaam: string;
  hoeveelheid: number;
  eenheid: string;
  periode: number;
  energie: number;
  eiwit: number;
  vet: number;
  koolhydraten: number;
  vezels: number;
}

export interface EetmeterMaaltijd {
  naam: string;
  periode: number;
  energie: number;
  eiwit: number;
  vet: number;
  koolhydraten: number;
  items: EetmeterConsumptie[];
}

export interface EetmeterDagData {
  datum: string;
  maaltijden: EetmeterMaaltijd[];
  totaalEnergie: number;
  totaalEiwit: number;
  totaalVet: number;
  totaalKoolhydraten: number;
}

// ---- Hulpfuncties ----------------------------------------------------------

/** Formateer een Date als yyyyMMdd voor de Eetmeter API */
export function toEetmeterDatum(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Groepeer ruwe consumptie-items per periode en bouw MaaltijdRecord's */
function groeperPerPeriode(items: EetmeterConsumptieRaw[], datum: string): EetmeterDagData {
  const maaltijdenMap = new Map<number, EetmeterMaaltijd>();

  for (const item of items) {
    if (item.active === false) continue;

    const periode = item.period ?? 4;
    const consumptie: EetmeterConsumptie = {
      id: item.id ?? crypto.randomUUID(),
      productNaam: item.productName ?? "",
      merkNaam: item.brandName ?? "",
      hoeveelheid: item.amount ?? 0,
      eenheid: item.unitName ?? "g",
      periode,
      energie: item.energie ?? 0,
      eiwit: item.eiwit ?? 0,
      vet: item.vet ?? 0,
      koolhydraten: item.koolhydraten ?? 0,
      vezels: item.vezels ?? 0,
    };

    if (!maaltijdenMap.has(periode)) {
      maaltijdenMap.set(periode, {
        naam: PERIODE_NAMEN[periode] ?? `Overig (${periode})`,
        periode,
        energie: 0,
        eiwit: 0,
        vet: 0,
        koolhydraten: 0,
        items: [],
      });
    }

    const maaltijd = maaltijdenMap.get(periode)!;
    maaltijd.items.push(consumptie);
    maaltijd.energie += consumptie.energie;
    maaltijd.eiwit += consumptie.eiwit;
    maaltijd.vet += consumptie.vet;
    maaltijd.koolhydraten += consumptie.koolhydraten;
  }

  // Sorteer maaltijden op periode (Ontbijt → Lunch → Avondeten → Tussendoor → Overig)
  const maaltijden = Array.from(maaltijdenMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, m]) => m);

  const totaalEnergie = maaltijden.reduce((s, m) => s + m.energie, 0);
  const totaalEiwit = maaltijden.reduce((s, m) => s + m.eiwit, 0);
  const totaalVet = maaltijden.reduce((s, m) => s + m.vet, 0);
  const totaalKoolhydraten = maaltijden.reduce((s, m) => s + m.koolhydraten, 0);

  return { datum, maaltijden, totaalEnergie, totaalEiwit, totaalVet, totaalKoolhydraten };
}

// ---- Client klasse ---------------------------------------------------------

export class EetmeterClient {
  private token: string | null = null;
  private readonly deviceId: string;

  constructor(deviceId?: string) {
    this.deviceId = deviceId ?? `menufit-${Math.random().toString(36).slice(2, 10)}`;
  }

  get isLoggedIn(): boolean {
    return this.token !== null;
  }

  /** Login bij Eetmeter en sla het token op in geheugen */
  async login(emailAddress: string, password: string): Promise<void> {
    const response = await fetch(`${EETMETER_API_BASE}account/credentials`, {
      method: "POST",
      headers: EETMETER_HEADERS,
      body: JSON.stringify({ deviceId: this.deviceId, emailAddress, password }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new EetmeterClientError(
          "INVALID_CREDENTIALS",
          "Onjuiste e-mailadres of wachtwoord.",
        );
      }
      throw new EetmeterClientError(
        "LOGIN_FAILED",
        `Inloggen mislukt: HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as EetmeterLoginResponse;
    if (!data.token) {
      throw new EetmeterClientError(
        "NO_TOKEN",
        data.Message ?? "Geen token ontvangen van Eetmeter API.",
      );
    }
    this.token = data.token;
  }

  /** Haal consumptie-items op voor een dag (formaat: yyyyMMdd) */
  async fetchDag(datum: string): Promise<EetmeterDagData> {
    if (!this.token) {
      throw new EetmeterClientError(
        "NOT_LOGGED_IN",
        "Niet ingelogd bij Eetmeter. Voer eerst je credentials in.",
      );
    }

    const response = await fetch(`${EETMETER_API_BASE}consumption/${datum}/${datum}`, {
      method: "GET",
      headers: {
        ...EETMETER_HEADERS,
        Authorization: `Basic ${this.token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      this.token = null;
      throw new EetmeterClientError(
        "AUTH_EXPIRED",
        "Eetmeter sessie verlopen. Log opnieuw in.",
      );
    }

    if (!response.ok) {
      throw new EetmeterClientError(
        "FETCH_FAILED",
        `Ophalen mislukt: HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as EetmeterDayResponse | EetmeterConsumptieRaw[];

    let items: EetmeterConsumptieRaw[];
    if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data.items)) {
      items = data.items;
    } else {
      items = [];
    }

    // Converteer yyyyMMdd terug naar YYYY-MM-DD voor weergave
    const datumLeesbaar = `${datum.slice(0, 4)}-${datum.slice(4, 6)}-${datum.slice(6, 8)}`;
    return groeperPerPeriode(items, datumLeesbaar);
  }

  /** Log uit en verwijder het token */
  logout(): void {
    this.token = null;
  }
}
