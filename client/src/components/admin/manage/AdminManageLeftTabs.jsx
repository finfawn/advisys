import React from "react";

export default function AdminManageLeftTabs({ activeTab, onChange }) {
  return (
    <aside className="manage-left">
      <button
        type="button"
        className={`left-pill ${activeTab === "students" ? "active" : ""}`}
        onClick={() => onChange("students")}
      >
        Students
      </button>
      <button
        type="button"
        className={`left-pill ${activeTab === "advisors" ? "active" : ""}`}
        onClick={() => onChange("advisors")}
      >
        Advisors
      </button>
    </aside>
  );
}
