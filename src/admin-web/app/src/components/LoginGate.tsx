import { useState, type FormEvent } from "react";

interface LoginGateProps {
  defaultBaseUrl: string;
  defaultOperatorId: string;
  onLogin: (baseUrl: string, accessToken: string, operatorId: string) => Promise<void>;
}

export function LoginGate({ defaultBaseUrl, defaultOperatorId, onLogin }: LoginGateProps) {
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [accessToken, setAccessToken] = useState("");
  const [operatorId, setOperatorId] = useState(defaultOperatorId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim() || !accessToken.trim() || !operatorId.trim()) {
      setError("Vul alle velden in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onLogin(baseUrl.trim(), accessToken.trim(), operatorId.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt. Controleer de gegevens.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <h1 style={styles.title}>MenuFit Admin</h1>
        <p style={styles.subtitle}>Voer je admin-sessie gegevens in</p>
        <form onSubmit={(e) => void handleSubmit(e)} style={styles.form}>
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
            Operator ID
            <input
              style={styles.input}
              type="text"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="admin@menufit.nl"
              required
            />
          </label>
          <label style={styles.label}>
            Access Token
            <input
              style={styles.input}
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Bearer token"
              required
            />
          </label>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Verbinden…" : "Inloggen"}
          </button>
        </form>
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
} as const;
