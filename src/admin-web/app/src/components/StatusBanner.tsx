import type { AdminDashboardViewsState, AdminTab } from "@lib/types.ts";

interface StatusBannerProps {
  views: AdminDashboardViewsState;
  selectedTab: AdminTab;
}

export function StatusBanner({ views, selectedTab }: StatusBannerProps) {
  const currentView = views[selectedTab];

  if (currentView.status === "loading") {
    return <div style={{ ...styles.banner, ...styles.loading }}>⏳ Laden…</div>;
  }

  if (currentView.status === "error" && currentView.error) {
    return (
      <div style={{ ...styles.banner, ...styles.error }}>
        <strong>Fout: {currentView.error.code}</strong> — {currentView.error.message}
        {currentView.error.hint && <span style={styles.hint}> ({currentView.error.hint})</span>}
      </div>
    );
  }

  return null;
}

const styles = {
  banner: {
    padding: "10px 16px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
  },
  loading: {
    background: "#e8f4ff",
    color: "#0066cc",
    border: "1px solid #b3d7ff",
  },
  error: {
    background: "#fff0f0",
    color: "#cc0000",
    border: "1px solid #ffb3b3",
  },
  hint: {
    opacity: 0.8,
  },
} as const;
