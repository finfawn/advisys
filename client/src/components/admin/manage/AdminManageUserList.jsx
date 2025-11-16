import React from "react";
import AdminManageUserRow from "./AdminManageUserRow";
import { Skeleton } from "../../../lightswind/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../lightswind/table";

export default function AdminManageUserList({
  items,
  isStudent,
  onView,
  onHistory,
  onToggleActive,
  loading = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  memberSet,
  memberStatusMap,
  canEditTermStatus,
  onChangeTermStatus,
  showTermStatus,
}) {
  if (loading) {
    return (
      <Table containerClassName="h-full admin-table" containerStyle={{ height: "100%", maxHeight: "none" }}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input type="checkbox" aria-label="Select all" onChange={(e)=>onToggleSelectAll && onToggleSelectAll(e.target.checked)} />
            </TableHead>
            <TableHead className="w-[240px]">Name</TableHead>
            <TableHead className="w-[300px]">{isStudent ? "Program" : "Department"}</TableHead>
            {isStudent && <TableHead className="w-[120px]">Year</TableHead>}
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[64px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, idx) => (
            <TableRow key={idx}>
              <TableCell className="w-8">
                <Skeleton variant="rect" width={16} height={16} shimmer />
              </TableCell>
              <TableCell className="w-[240px]">
                <div className="min-w-0">
                  <Skeleton width="55%" height={10} shimmer />
                  <div className="mt-1">
                    <Skeleton width="40%" height={8} shimmer />
                  </div>
                </div>
              </TableCell>
              <TableCell className="w-[300px]">
                <Skeleton width={220} height={16} shimmer />
              </TableCell>
              {isStudent && (
                <TableCell className="w-[120px]">
                  <Skeleton width={48} height={12} shimmer />
                </TableCell>
              )}
              <TableCell className="w-[120px]">
                <div className="flex items-center gap-2">
                  <Skeleton width={64} height={18} shimmer />
                  {/* Always show enrollment status skeleton to prevent layout shift */}
                  <div className={showTermStatus && isStudent ? "animate-pulse" : "opacity-0"}>
                    <Skeleton width={60} height={16} shimmer />
                  </div>
                </div>
              </TableCell>
              <TableCell className="w-[64px]">
                <div className="flex gap-2 justify-end w-full">
                  <Skeleton variant="circle" width={28} height={28} shimmer />
                  <Skeleton variant="circle" width={28} height={28} shimmer />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Table containerClassName="h-full" containerStyle={{ height: "100%", maxHeight: "none" }}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input type="checkbox" aria-label="Select all" onChange={(e)=>onToggleSelectAll && onToggleSelectAll(e.target.checked)} />
            </TableHead>
            <TableHead className="w-[240px]">Name</TableHead>
            <TableHead className="w-[300px]">{isStudent ? "Program" : "Department"}</TableHead>
            {isStudent && <TableHead className="w-[120px]">Year</TableHead>}
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[64px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={isStudent ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">
              No users found
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table containerClassName="h-full admin-table" containerStyle={{ height: "100%", maxHeight: "none" }}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <input type="checkbox" aria-label="Select all" onChange={(e)=>onToggleSelectAll && onToggleSelectAll(e.target.checked)} />
          </TableHead>
          <TableHead className="w-[240px]">Name</TableHead>
          <TableHead className="w-[300px]">{isStudent ? "Program" : "Department"}</TableHead>
          {isStudent && <TableHead className="w-[120px]">Year</TableHead>}
          <TableHead className="w-[120px]">Status</TableHead>
          <TableHead className="w-[64px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <AdminManageUserRow
            key={item.id}
            item={item}
            isStudent={isStudent}
            onView={onView}
            onHistory={onHistory}
            onToggleActive={onToggleActive}
            selected={selectedIds.includes(item.id)}
            onToggleSelect={onToggleSelect}
            isMember={!!(memberSet && memberSet.has(item.id))}
            termStatus={memberStatusMap ? memberStatusMap.get(item.id) : undefined}
            canEditTermStatus={!!canEditTermStatus}
            onChangeTermStatus={onChangeTermStatus}
            showTermStatus={!!showTermStatus}
          />
        ))}
      </TableBody>
    </Table>
  );
}
