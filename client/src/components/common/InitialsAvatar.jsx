import React from "react";

export default function InitialsAvatar({ name, size = 40, className = "" }) {
  const text = String(name || "").trim();
  const parts = text.split(/\s+/).filter(Boolean);
  const first = parts[0] ? parts[0][0] : "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  const initials = (first + last || first || "?").toUpperCase();
  const style = {
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundColor: "#e5e7eb",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: Math.max(12, Math.floor(size * 0.44)),
    userSelect: "none",
    overflow: "hidden",
  };
  return <div className={className} style={style} aria-hidden>{initials}</div>;
}
