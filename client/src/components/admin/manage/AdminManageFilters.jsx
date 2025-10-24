import React from "react";

export default function AdminManageFilters({ search, onSearchChange }) {
  return (
    <div className="manage-filters">
      <input
        className="manage-search"
        placeholder="Search users"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
