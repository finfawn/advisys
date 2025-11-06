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
    <div className="manage-filters flex w-full items-center justify-end gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[220px] max-w-[520px]">
        <Input
          placeholder="Search users"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 px-2 py-1 text-xs md:h-10 md:px-3 md:py-2 md:text-sm"
        />
      </div>

      {isStudent && (
        <Select value={yearFilter} onValueChange={onYearChange}>
          <SelectTrigger className="select-trigger w-[140px] h-8 px-2 py-1 text-xs md:h-10 md:px-3 md:text-sm"><SelectValue placeholder="Year Level" /></SelectTrigger>
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
        <SelectTrigger className="select-trigger w-[140px] h-8 px-2 py-1 text-xs md:h-10 md:px-3 md:text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="select-trigger w-[160px] h-8 px-2 py-1 text-xs md:h-10 md:px-3 md:text-sm"><SelectValue placeholder="Sort By" /></SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="name-asc">Name A-Z</SelectItem>
          <SelectItem value="name-desc">Name Z-A</SelectItem>
          <SelectItem value="status">Status</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm" onClick={onUploadUsersOpen}>Upload Users</Button>
        <Button size="sm" className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm" onClick={onAddUserOpen}>Add User</Button>
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm" onClick={onExport}>Download CSV</Button>
      </div>
    </div>
  );
}
