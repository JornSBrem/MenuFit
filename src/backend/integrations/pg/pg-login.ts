/**
 * Project Gezond API login.
 *
 * POSTs credentials naar de PG login-URL en extraheert de sessie-cookies
 * die nodig zijn voor alle vervolgverzoeken.
 */

export interface PgLoginCredentials {
  email: string;
  password: string;
}

export interface PgLoginResult {
  /** Cookie-header string klaar voor gebruik als "Cookie: <value>" */
  cookieHeader: string;
  /** Volledig object voor PG_EXTRA_HEADERS_JSON */
  extraHeaders: Record<string, string>;
  /** Ruwe cookie-namen die zijn ontvangen (voor logging) */
  cookieNames: string[];
  /** HTTP-statuscode van het login-antwoord */
  statusCode: number;
}

export class PgLoginError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PgLoginError";
    this.code = code;
  }
}

/**
 * Extraheert cookie-naam uit een Set-Cookie header-waarde.
 * Set-Cookie: name=value; Path=/; HttpOnly; ...
 */
const extractCookieName = (setCookieValue: string): string =>
  setCookieValue.split(";")[0]?.split("=")[0]?.trim() ?? "";

/**
 * Converteert een array van Set-Cookie headers naar één Cookie-header string.
 * Filtert lege entries weg.
 */
const buildCookieHeader = (setCookieHeaders: string[]): string =>
  setCookieHeaders
    .map((header) => header.split(";")[0]?.trim() ?? "")
    .filter(Boolean)
    .join("; ");

/**
 * Probeert een Bearer-token te extraheren uit de JSON-response body.
 * Kijkt naar veelgebruikte veldnamen: token, access_token, jwt, data.token, data.access_token.
 */
const extractBodyToken = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  // Direct op root — inclusief "accesToken" (typfout in PG API)
  for (const key of ["token", "access_token", "jwt", "accessToken", "accesToken", "auth_token"]) {
    if (typeof b[key] === "string" && (b[key] as string).length > 0) {
      return b[key] as string;
    }
  }

  // Eén niveau dieper via "data"
  if (b.data && typeof b.data === "object") {
    const d = b.data as Record<string, unknown>;
    for (const key of ["token", "access_token", "jwt", "accessToken", "accesToken", "auth_token"]) {
      if (typeof d[key] === "string" && (d[key] as string).length > 0) {
        return d[key] as string;
      }
    }
  }

  return null;
};

export const loginToPg = async (
  credentials: PgLoginCredentials,
  loginUrl: string,
): Promise<PgLoginResult> => {
  if (!credentials.email?.trim()) {
    throw new PgLoginError("MISSING_EMAIL", "E-mailadres is vereist.");
  }
  if (!credentials.password) {
    throw new PgLoginError("MISSING_PASSWORD", "Wachtwoord is vereist.");
  }

  let response: Response;
  let responseBody: unknown = null;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    });
  } catch (err) {
    throw new PgLoginError(
      "NETWORK_ERROR",
      `Verbinding met PG mislukt: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Lees body altijd — nodig voor zowel foutdetails als JWT-token
  try {
    responseBody = await response.json();
  } catch {
    // Body is geen JSON, of al gelezen — negeer
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    if (responseBody && typeof responseBody === "object") {
      const b = responseBody as Record<string, unknown>;
      if (typeof b.message === "string") detail = b.message;
      else if (typeof b.error === "string") detail = b.error;
    }
    throw new PgLoginError("LOGIN_FAILED", `PG login mislukt (${response.status}): ${detail}`);
  }

  // --- Strategie 1: cookies via Set-Cookie headers ---
  let setCookieHeaders: string[] = [];
  if (typeof (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function") {
    setCookieHeaders = (response.headers as unknown as { getSetCookie: () => string[] }).getSetCookie();
  } else {
    const raw = response.headers.get("set-cookie");
    if (raw) setCookieHeaders = [raw];
  }

  if (setCookieHeaders.length > 0) {
    const cookieHeader = buildCookieHeader(setCookieHeaders);
    const cookieNames = setCookieHeaders.map(extractCookieName).filter(Boolean);
    const extraHeaders: Record<string, string> = {
      "X-Requested-With": "XMLHttpRequest",
      Cookie: cookieHeader,
    };
    return { cookieHeader, extraHeaders, cookieNames, statusCode: response.status };
  }

  // --- Strategie 2: Bearer-token in response body ---
  const bearerToken = extractBodyToken(responseBody);
  if (bearerToken) {
    const extraHeaders: Record<string, string> = {
      "X-Requested-With": "XMLHttpRequest",
      Authorization: `Bearer ${bearerToken}`,
    };
    return {
      cookieHeader: "",
      extraHeaders,
      cookieNames: ["bearer_token"],
      statusCode: response.status,
    };
  }

  // Geef een volledige (maar veilige) body-dump mee voor diagnose
  let bodyDescription: string;
  if (responseBody && typeof responseBody === "object") {
    // Vervang wachtwoord-achtige waarden door *** maar behoud structuur
    const sanitize = (obj: unknown, depth = 0): unknown => {
      if (depth > 4 || obj === null || typeof obj !== "object") return obj;
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        const lk = k.toLowerCase();
        if (lk.includes("password") || lk.includes("secret") || lk.includes("wachtwoord")) {
          result[k] = "***";
        } else if (typeof v === "string" && v.length > 80) {
          result[k] = v.slice(0, 40) + "…";
        } else if (typeof v === "object" && v !== null) {
          result[k] = sanitize(v, depth + 1);
        } else {
          result[k] = v;
        }
      }
      return result;
    };
    bodyDescription = `Body: ${JSON.stringify(sanitize(responseBody), null, 2)}`;
  } else {
    bodyDescription = `Body (raw): ${String(responseBody).slice(0, 200)}`;
  }

  const cookieInfo = setCookieHeaders.length > 0
    ? ` | Set-Cookie headers: ${setCookieHeaders.map(h => h.split(";")[0]).join(", ")}`
    : " | Geen Set-Cookie headers ontvangen.";

  throw new PgLoginError(
    "NO_AUTH_TOKEN",
    `PG login succesvol (HTTP 200) maar geen token gevonden.${cookieInfo}\n${bodyDescription}`,
  );
};
