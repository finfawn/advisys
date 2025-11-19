import React from "react";
import { BsClockHistory, BsSlashCircle, BsCheckCircle } from "react-icons/bs";
import { Button } from "../../../lightswind/button";
import { Badge } from "../../../lightswind/badge";
import { TableRow, TableCell } from "../../../lightswind/table";

export default function AdminManageUserRow({
  item,
  isStudent,
  onView,
  onHistory,
  onToggleActive,
  selected = false,
  onToggleSelect,
  isMember = false,
  termStatus,
  canEditTermStatus = false,
  onChangeTermStatus,
  showTermStatus = false,
}) {
  return (
    <TableRow onClick={() => onView && onView(item)} className="cursor-pointer hover:bg-gray-50">
      <TableCell className="w-8">
        <input
          type="checkbox"
          aria-label={`Select ${item.name}`}
          checked={!!selected}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleSelect && onToggleSelect(item.id, e.target.checked)}
        />
      </TableCell>
      <TableCell className="w-[240px] py-1">
        <div className="min-w-0">
          <div className="font-semibold text-primary truncate leading-tight" title={item.name}>{item.name}</div>
          {item.email && (
            <div className="hidden xl:block text-[11px] text-gray-500 truncate leading-tight" title={item.email}>{item.email}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[300px] py-1">
        <div className="truncate" title={isStudent ? (item.program || '') : (item.department || '')}>
          <span className="inline-flex items-center rounded-md border px-1 py-[1px] text-[11px] bg-gray-50 truncate">
            {isStudent ? (item.program || '—') : (item.department || '—')}
          </span>
        </div>
      </TableCell>
      {isStudent && (
        <TableCell className="w-[120px]">
          <div className="text-sm">{item.year}</div>
        </TableCell>
      )}
      <TableCell className="w-[120px] py-1">
        <div className="flex items-center" style={{ minHeight: 22 }}>
          <Badge
            variant={item.active ? "success" : "outline"}
            withDot
            dotColor={item.active ? "#16a34a" : "#9ca3af"}
          >
            {item.active ? "Active" : "Inactive"}
          </Badge>
          {(() => {
            if (!item.active && (item.deactivationReason || item.deactivationOther)) {
              return (
                <span
                  className="ml-2 inline-flex items-center rounded-md border px-2 py-1 text-xs max-w-[120px] truncate"
                  title={item.deactivationReason === 'other' ? (item.deactivationOther || 'Other') : (item.deactivationReason || '')}
                >
                  Deactivated
                </span>
              );
            } else if (showTermStatus && isStudent && item.active && isMember && termStatus !== undefined && String(termStatus || '').toLowerCase() === 'enrolled') {
              return (
                <span 
                  className={`ml-2 inline-flex items-center rounded-md border px-2 py-1 text-xs transition-all duration-300 enrollment-tag opacity-100`}
                >
                  {(() => {
                    const s = String(termStatus || 'enrolled');
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  })()}
                </span>
              );
            }
            return null;
          })()}
        </div>
      </TableCell>
      <TableCell className="w-[64px] text-right py-1">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label="History"
            className="compact-icon-btn"
            onClick={(e) => { e.stopPropagation(); onHistory && onHistory(item); }}
          >
            <BsClockHistory className="w-4 h-4" />
          </Button>
          <Button
            variant={item.active ? "destructive" : "default"}
            size="icon"
            aria-label={item.active ? "Deactivate" : "Activate"}
            className="compact-icon-btn"
            onClick={(e) => { e.stopPropagation(); onToggleActive && onToggleActive(item); }}
          >
            {item.active ? <BsSlashCircle className="w-4 h-4" /> : <BsCheckCircle className="w-4 h-4" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
