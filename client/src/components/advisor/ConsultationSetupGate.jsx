import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConsultationSetupGate({
  open = false,
  missing = { topics: [], guidelines: [], courses: [] },
  onProceed,
}) {
  const needsTopics = !Array.isArray(missing.topics) || missing.topics.length === 0;
  const needsGuidelines = !Array.isArray(missing.guidelines) || missing.guidelines.length === 0;
  const needsCourses = !Array.isArray(missing.courses) || missing.courses.length === 0;
  const needsAny = needsTopics || needsGuidelines || needsCourses;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10050,
            display: "grid",
            placeItems: "center",
            backdropFilter: "blur(6px)",
            background: "rgba(17, 24, 39, 0.45)",
          }}
        >
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{
              width: "min(560px, 92%)",
              borderRadius: 16,
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.15)",
              padding: 22,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }}>
                <defs>
                  <linearGradient id="gateRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2a51a3" />
                    <stop offset="100%" stopColor="#2aa3c8" />
                  </linearGradient>
                </defs>
                <motion.circle
                  cx="50%"
                  cy="0%"
                  r="220"
                  fill="none"
                  stroke="url(#gateRing)"
                  strokeWidth="2"
                  initial={{ pathLength: 0, opacity: 0.25 }}
                  animate={{ pathLength: 1, opacity: 0.45 }}
                  transition={{ duration: 1.1, ease: "easeInOut", delay: 0.1 }}
                />
              </svg>
            </div>
            <div style={{ display: "grid", placeItems: "center", marginBottom: 14 }}>
              <img
                src="/logo-large-transparent.png"
                alt=""
                aria-hidden
                style={{ width: 56, height: "auto", filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.15))" }}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>
                Complete Your Consultation Profile
              </h3>
              <p style={{ margin: "6px 0 0 0", color: "#4b5563", fontSize: 14 }}>
                Add at least one consultation topic, guideline, and subject to unlock advisor tools.
              </p>
            </div>
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <CheckRow ok={!needsTopics} label="At least one Topic I Can Help With" />
              <CheckRow ok={!needsGuidelines} label="At least one Preferred Consultation Guideline" />
              <CheckRow ok={!needsCourses} label="At least one Subject Taught" />
            </div>
            <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={onProceed}
                style={{
                  height: 44,
                  padding: "0 18px",
                  borderRadius: 10,
                  background: "#2a51a3",
                  border: "none",
                  color: "#fff",
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  boxShadow: "0 10px 22px rgba(48,107,184,0.35)",
                  cursor: "pointer",
                }}
              >
                Update Consultation Settings
              </button>
            </div>
            {!needsAny ? (
              <p style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Thanks! You’re all set — refresh if this doesn’t disappear automatically.
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CheckRow({ ok, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.08)",
        background: ok ? "#f0fdf4" : "#fff",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          display: "grid",
          placeItems: "center",
          background: ok ? "#16a34a" : "#e5e7eb",
          color: ok ? "#fff" : "#6b7280",
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {ok ? "✓" : "•"}
      </div>
      <div style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{label}</div>
    </div>
  );
}
