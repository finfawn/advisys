import React from "react";
import AdminManageUserRow from "./AdminManageUserRow";
import { Skeleton } from "../../../lightswind/skeleton";

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
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="manage-row">
            <div className="col name-col">
              <Skeleton variant="circle" width={40} height={40} shimmer />
              <div className="flex-1 min-w-0 ml-2">
                <Skeleton width="60%" height={14} shimmer />
                <div className="mt-1">
                  <Skeleton width="40%" height={12} shimmer />
                </div>
              </div>
            </div>
            <div className="col program-dept-col">
              <Skeleton width={100} height={22} shimmer />
            </div>
            {isStudent && (
              <div className="col year-col">
                <Skeleton width={80} height={20} shimmer />
              </div>
            )}
            <div className="col status-col">
              <Skeleton width={80} height={26} shimmer />
            </div>
            <div className="col actions-col" style={{ textAlign: "right" }}>
              <div className="flex gap-2 justify-end w-full">
                <Skeleton width={70} height={32} shimmer />
                <Skeleton width={80} height={32} shimmer />
                <Skeleton width={95} height={32} shimmer />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

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
