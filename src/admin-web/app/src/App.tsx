import { useState, useCallback, useRef } from "react";
import type { AdminSession, AdminTab, AdminDashboardUiState } from "@lib/types.ts";
import { AdminApiClient } from "@lib/admin-api.ts";
import { AdminDashboardController } from "@lib/admin-dashboard-controller.ts";
import { LoginGate } from "./components/LoginGate.tsx";
import { TabBar } from "./components/TabBar.tsx";
import { StatusBanner } from "./components/StatusBanner.tsx";
import { DataTab } from "./tabs/DataTab.tsx";
import { SettingsTab } from "./tabs/SettingsTab.tsx";
import { ExtractTab } from "./tabs/ExtractTab.tsx";
import { OperationsTab } from "./tabs/OperationsTab.tsx";

const STORAGE_KEY = "menufit_admin_session";

function loadSavedSession(): Partial<{ baseUrl: string; accessToken: string; operatorId: string }> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<{ baseUrl: string; accessToken: string; operatorId: string }>) : {};
  } catch {
    return {};
  }
}

function saveSession(baseUrl: string, session: AdminSession): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ baseUrl, accessToken: session.accessToken, operatorId: session.operatorId }),
  );
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [uiState, setUiState] = useState<AdminDashboardUiState | null>(null);
  const controllerRef = useRef<AdminDashboardController | null>(null);

  const handleLogin = useCallback(
    async (url: string, token: string, operatorId: string) => {
      const adminSession: AdminSession = {
        sessionKind: "admin",
        accessToken: token,
        operatorId,
        role: "operator",
      };
      const api = new AdminApiClient(url, adminSession);
      const controller = new AdminDashboardController(api);
      controllerRef.current = controller;
      saveSession(url, adminSession);
      setBaseUrl(url);
      setSession(adminSession);
      const state = await controller.loadDataView();
      setUiState(state);
    },
    [],
  );

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setBaseUrl("");
    setUiState(null);
    controllerRef.current = null;
  }, []);

  const handleTabChange = useCallback(async (tab: AdminTab) => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    const state = ctrl.selectTab(tab);
    setUiState({ ...state });

    let next: AdminDashboardUiState;
    if (tab === "data") next = await ctrl.loadDataManagement();
    else if (tab === "settings") next = await ctrl.loadSettingsView();
    else if (tab === "extract") next = await ctrl.loadExtractView();
    else next = await ctrl.loadHouseholdOperations();
    setUiState({ ...next });
  }, []);

  const refreshUiState = useCallback(() => {
    const ctrl = controllerRef.current;
    if (ctrl) setUiState({ ...ctrl.getState() });
  }, []);

  const saved = loadSavedSession();

  if (!session) {
    return (
      <LoginGate
        defaultBaseUrl={saved.baseUrl ?? "http://localhost:3000"}
        defaultOperatorId={saved.operatorId ?? ""}
        onLogin={handleLogin}
      />
    );
  }

  const ctrl = controllerRef.current!;
  const selectedTab = uiState?.selectedTab ?? "data";

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <span style={styles.logo}>MenuFit Admin</span>
        <span style={styles.operatorInfo}>
          {session.operatorId} @ {baseUrl}
        </span>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Uitloggen
        </button>
      </header>

      <TabBar selectedTab={selectedTab} onTabChange={handleTabChange} />

      {uiState && (
        <main style={styles.main}>
          <StatusBanner views={uiState.views} selectedTab={selectedTab} />

          {selectedTab === "data" && (
            <DataTab
              viewState={uiState.views.data}
              controller={ctrl}
              onStateChange={refreshUiState}
            />
          )}
          {selectedTab === "settings" && (
            <SettingsTab
              viewState={uiState.views.settings}
              controller={ctrl}
              onStateChange={refreshUiState}
            />
          )}
          {selectedTab === "extract" && (
            <ExtractTab
              viewState={uiState.views.extract}
              controller={ctrl}
              onStateChange={refreshUiState}
            />
          )}
          {selectedTab === "operations" && (
            <OperationsTab
              viewState={uiState.views.operations}
              controller={ctrl}
              onStateChange={refreshUiState}
            />
          )}
        </main>
      )}
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    background: "#f5f5f7",
  },
  header: {
    background: "#1d1d1f",
    color: "#fff",
    padding: "0 24px",
    height: 48,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  logo: {
    fontWeight: 700,
    fontSize: 16,
    marginRight: "auto",
  },
  operatorInfo: {
    fontSize: 12,
    opacity: 0.7,
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    padding: "4px 12px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
  },
  main: {
    flex: 1,
    padding: 24,
    maxWidth: 1280,
    margin: "0 auto",
    width: "100%",
  },
} as const;
