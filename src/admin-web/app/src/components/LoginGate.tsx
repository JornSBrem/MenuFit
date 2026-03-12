import { useState, type FormEvent } from "react";

interface LoginGateProps {
  defaultBaseUrl: string;
  defaultOperatorId: string;
  onLogin: (baseUrl: string, accessToken: string, operatorId: string) => Promise<void>;
}

type SupabaseLoginEnvelope = {
  ok: boolean;
  data?: {
    accessToken: string;
    userId: string;
    email?: string;
  };
  error?: { code: string; message: string; hint?: string };
};

function toDisplayMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function LoginGate({ defaultBaseUrl, defaultOperatorId, onLogin }: LoginGateProps) {
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [email, setEmail] = useState(defaultOperatorId);
  const [password, setPassword] = useState("");
  const [showTokenLogin, setShowTokenLogin] = useState(false);
  const [rawToken, setRawToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSupabaseLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim() || !email.trim() || !password) {
      setError("Vul alle velden in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v3/auth/supabase/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json() as SupabaseLoginEnvelope;
      if (!data.ok || !data.data?.accessToken) {
        throw new Error(data.error?.message ?? "Inloggen via Supabase mislukt. Controleer je gegevens.");
      }
      await onLogin(baseUrl.trim(), data.data.accessToken, data.data.email ?? email.trim());
    } catch (error) {
      setError(toDisplayMessage(error, "Inloggen mislukt. Controleer de gegevens."));
    } finally {
      setLoading(false);
    }
  };

  const handleTokenLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim() || !rawToken.trim()) {
      setError("Vul alle velden in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onLogin(baseUrl.trim(), rawToken.trim(), "dev-admin");
    } catch (error) {
      setError(toDisplayMessage(error, "Token ongeldig. Controleer de waarde."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h1 style={styles.title}>MenuFit Admin</h1>

        {!showTokenLogin ? (
          <>
            <p style={styles.subtitle}>Log in met je Supabase e-mailadres en wachtwoord</p>
            <form onSubmit={(e) => void handleSupabaseLogin(e)} style={styles.form}>
              <label style={styles.label}>
                Backend URL
                <input
                  style={styles.input}
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://192.168.1.172"
                  required
                />
              </label>
              <label style={styles.label}>
                E-mailadres
                <input
                  style={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.nl"
                  autoComplete="username"
                  required
                />
              </label>
              <label style={styles.label}>
                Wachtwoord
                <input
                  style={styles.input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>
              {error && <p style={styles.error}>{error}</p>}
              <button style={styles.button} type="submit" disabled={loading}>
                {loading ? "Inloggen…" : "Inloggen met Supabase"}
              </button>
            </form>
            <button
              style={styles.switchBtn}
              onClick={() => { setShowTokenLogin(true); setError(null); }}
            >
              Inloggen met token (dev)
            </button>
          </>
        ) : (
          <>
            <p style={styles.subtitle}>Voer je admin-sessie token in</p>
            <form onSubmit={(e) => void handleTokenLogin(e)} style={styles.form}>
              <label style={styles.label}>
                Backend URL
                <input
                  style={styles.input}
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  required
                />
              </label>
              <label style={styles.label}>
                Access Token
                <input
                  style={styles.input}
                  type="password"
                  value={rawToken}
                  onChange={(e) => setRawToken(e.target.value)}
                  placeholder="admin:dev-admin:sess-1:owner:..."
                  required
                />
              </label>
              {error && <p style={styles.error}>{error}</p>}
              <button style={styles.button} type="submit" disabled={loading}>
                {loading ? "Verbinden…" : "Inloggen met token"}
              </button>
            </form>
            <button
              style={styles.switchBtn}
              onClick={() => { setShowTokenLogin(false); setError(null); }}
            >
              ← Terug naar inloggen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f7",
    padding: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 40,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
  },
  title: {
    margin: "0 0 4px",
    fontSize: 24,
    fontWeight: 700,
  },
  subtitle: {
    margin: "0 0 28px",
    color: "#6e6e73",
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: "#1d1d1f",
  },
  input: {
    border: "1px solid #d2d2d7",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  },
  error: {
    color: "#c00",
    fontSize: 13,
    margin: 0,
    background: "#fff0f0",
    padding: "8px 12px",
    borderRadius: 6,
  },
  button: {
    background: "#0071e3",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
  },
  switchBtn: {
    display: "block",
    marginTop: 20,
    background: "none",
    border: "none",
    color: "#0071e3",
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
    textAlign: "center" as const,
    width: "100%",
  },
} as const;
