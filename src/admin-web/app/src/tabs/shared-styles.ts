import type { CSSProperties } from "react";

export const card: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

export const section = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  } as CSSProperties,
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  } as CSSProperties,
};

export const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

export const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid #e5e5ea",
  fontWeight: 600,
  color: "#6e6e73",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

export const td: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid #f0f0f5",
  verticalAlign: "top",
};

export const btn: CSSProperties = {
  background: "#0071e3",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

export const btnSecondary: CSSProperties = {
  background: "#f5f5f7",
  color: "#1d1d1f",
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

export const btnDanger: CSSProperties = {
  background: "#fff",
  color: "#c00",
  border: "1px solid #ffb3b3",
  borderRadius: 6,
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};

export const emptyMsg: CSSProperties = {
  color: "#6e6e73",
  fontStyle: "italic",
  margin: "12px 0",
  fontSize: 13,
};

export const fieldset: CSSProperties = {
  background: "#f8f8fb",
  border: "1px solid #e5e5ea",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6e6e73",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

export const input: CSSProperties = {
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
};

export const select: CSSProperties = {
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
  background: "#fff",
};

export const textarea: CSSProperties = {
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  width: "100%",
  minHeight: 80,
  resize: "vertical",
};
