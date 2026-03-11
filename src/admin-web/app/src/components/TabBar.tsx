import type { AdminTab } from "@lib/types.ts";

interface TabBarProps {
  selectedTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const TABS: { id: AdminTab; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "settings", label: "Instellingen" },
  { id: "extract", label: "Extract / Jobs" },
  { id: "operations", label: "Operations" },
  { id: "eetmeter", label: "Eetmeter" },
];

export function TabBar({ selectedTab, onTabChange }: TabBarProps) {
  return (
    <nav style={styles.nav}>
      <div style={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(selectedTab === tab.id ? styles.activeTab : {}),
            }}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: "#fff",
    borderBottom: "1px solid #d2d2d7",
  },
  tabs: {
    display: "flex",
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 24px",
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "3px solid transparent",
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 500,
    color: "#6e6e73",
    cursor: "pointer",
    marginBottom: -1,
    transition: "color 0.15s",
  },
  activeTab: {
    color: "#0071e3",
    borderBottomColor: "#0071e3",
  },
} as const;
