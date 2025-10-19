import React from "react";
import AdminManageUserRow from "./AdminManageUserRow";

export default function AdminManageUserList({ items, isStudent, onView, onHistory, onToggleActive }) {
  if (!items || items.length === 0) {
    return (
      <div className="manage-list">
        <div className="manage-row">
          <div className="col name-col">
            <span className="name-text">No users found</span>
          </div>
          <div className="col year-col">—</div>
          <div className="col actions-col" />
        </div>
      </div>
    );
  }

  return (
    <div className="manage-list">
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
