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
}) {
  if (loading) {
    return (
      <Table containerClassName="h-full" containerStyle={{ height: "100%", maxHeight: "none" }}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>{isStudent ? "Program" : "Department"}</TableHead>
            {isStudent && <TableHead>Year</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton variant="circle" width={32} height={32} shimmer />
                  <div className="flex-1 min-w-0">
                    <Skeleton width="60%" height={12} shimmer />
                    <div className="mt-1">
                      <Skeleton width="40%" height={10} shimmer />
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton width={100} height={20} shimmer />
              </TableCell>
              {isStudent && (
                <TableCell>
                  <Skeleton width={60} height={16} shimmer />
                </TableCell>
              )}
              <TableCell>
                <Skeleton width={80} height={24} shimmer />
              </TableCell>
              <TableCell>
                <div className="flex gap-2 justify-end w-full">
                  <Skeleton variant="circle" width={32} height={32} shimmer />
                  <Skeleton variant="circle" width={32} height={32} shimmer />
                  <Skeleton variant="circle" width={32} height={32} shimmer />
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
            <TableHead>Name</TableHead>
            <TableHead>{isStudent ? "Program" : "Department"}</TableHead>
            {isStudent && <TableHead>Year</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
    <Table containerClassName="h-full" containerStyle={{ height: "100%", maxHeight: "none" }}>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>{isStudent ? "Program" : "Department"}</TableHead>
          {isStudent && <TableHead>Year</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
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
          />
        ))}
      </TableBody>
    </Table>
  );
}
