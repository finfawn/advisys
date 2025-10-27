import React from "react";
import { Input } from "../../../lightswind/input";
import { Button } from "../../../lightswind/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../../lightswind/select";

export default function AdminManageFilters({ 
  search,
  onSearchChange,
  isStudent,
  yearFilter,
  onYearChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
  onAddUserOpen,
  onUploadUsersOpen,
  onExport,
}) {
  return (
    <div className="manage-filters">
      <div className="flex items-center gap-2 w-full max-w-[520px] ml-auto">
        <div className="relative flex-1">
          <Input
            className=""
            placeholder="Search users"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {isStudent && (
      <Select value={yearFilter} onValueChange={onYearChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Year Level" /></SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">All Years</SelectItem>
          <SelectItem value="1st Year">1st Year</SelectItem>
          <SelectItem value="2nd Year">2nd Year</SelectItem>
          <SelectItem value="3rd Year">3rd Year</SelectItem>
          <SelectItem value="4th Year">4th Year</SelectItem>
        </SelectContent>
      </Select>
      )}

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sort By" /></SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="name-asc">Name A-Z</SelectItem>
          <SelectItem value="name-desc">Name Z-A</SelectItem>
          <SelectItem value="status">Status</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="secondary" onClick={onUploadUsersOpen}>Upload Users</Button>
      <Button onClick={onAddUserOpen}>Add User</Button>
      <Button variant="outline" onClick={onExport}>Export CSV</Button>
    </div>
  );
}
