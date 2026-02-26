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
      // Niet automatisch redirecten — we willen de cookies uit de first response
      redirect: "manual",
    });
  } catch (err) {
    throw new PgLoginError(
      "NETWORK_ERROR",
      `Verbinding met PG mislukt: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Haal alle Set-Cookie headers op
  // De Fetch API biedt geen directe toegang tot meerdere Set-Cookie headers via
  // response.headers.get() — dat merged ze. We gebruiken getSetCookie() waar beschikbaar,
  // anders vallen we terug op de samengevoegde waarde.
  let setCookieHeaders: string[] = [];

  // Node.js 18+ ondersteunt headers.getSetCookie()
  if (typeof (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function") {
    setCookieHeaders = (response.headers as unknown as { getSetCookie: () => string[] }).getSetCookie();
  } else {
    const raw = response.headers.get("set-cookie");
    if (raw) {
      setCookieHeaders = [raw];
    }
  }

  if (!response.ok && response.status !== 302 && response.status !== 301) {
    // Probeer body te lezen voor foutdetails
    let detail = "";
    try {
      const text = await response.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      detail = typeof parsed.message === "string" ? parsed.message : text.slice(0, 200);
    } catch {
      detail = `HTTP ${response.status}`;
    }
    throw new PgLoginError(
      "LOGIN_FAILED",
      `PG login mislukt (${response.status}): ${detail}`,
    );
  }

  if (setCookieHeaders.length === 0) {
    throw new PgLoginError(
      "NO_COOKIES",
      "PG login succesvol maar geen sessie-cookies ontvangen. " +
        "Mogelijk zijn de inloggegevens onjuist of gebruikt PG een ander auth-mechanisme.",
    );
  }

  const cookieHeader = buildCookieHeader(setCookieHeaders);
  const cookieNames = setCookieHeaders.map(extractCookieName).filter(Boolean);

  const extraHeaders: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
    Cookie: cookieHeader,
  };

  return {
    cookieHeader,
    extraHeaders,
    cookieNames,
    statusCode: response.status,
  };
};
