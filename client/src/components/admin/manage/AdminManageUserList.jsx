import React from "react";
import AdminManageUserRow from "./AdminManageUserRow";

export default function AdminManageUserList({
  items,
  isStudent,
  onView,
  onHistory,
  onToggleActive,
}) {
  if (!items || items.length === 0) {
    return (
      <div className="manage-list">
        <div className="manage-row header">
          <div className="col name-col">Name</div>
          <div className="col program-dept-col">
            {isStudent ? "Program" : "Department"}
          </div>
          {isStudent && <div className="col year-col">Year</div>}
          <div className="col status-col">Status</div>
          <div className="col actions-col" style={{ textAlign: "right" }}>
            Actions
          </div>
        </div>
        <div className="manage-row empty-row">
          <div
            className="col"
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "32px 16px",
              color: "#9ca3af",
            }}
          >
            No users found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-list">
      <div className="manage-row header">
        <div className="col name-col">Name</div>
        <div className="col program-dept-col">
          {isStudent ? "Program" : "Department"}
        </div>
        {isStudent && <div className="col year-col">Year</div>}
        <div className="col status-col">Status</div>
        <div className="col actions-col" style={{ textAlign: "right" }}>
          Actions
        </div>
      </div>
      {items.map((item) => (
        <AdminManageUserRow
          key={item.id}
          item={item}
          isStudent={isStudent}
          onView={onView}
          onHistory={onHistory}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
