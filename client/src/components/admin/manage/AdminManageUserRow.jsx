import React from "react";
import {
  BsPersonCircle,
  BsBook,
  BsCalendar3,
  BsBuilding,
  BsEye,
  BsClockHistory,
  BsSlashCircle,
  BsCheckCircle,
} from "react-icons/bs";
import { Button } from "../../../lightswind/button";
import { Badge } from "../../../lightswind/badge";
import { TableRow, TableCell } from "../../../lightswind/table";

export default function AdminManageUserRow({
  item,
  isStudent,
  onView,
  onHistory,
  onToggleActive,
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700">
            <BsPersonCircle />
          </span>
          <span className="font-semibold text-primary truncate">{item.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isStudent ? (
            <BsBook className="text-muted-foreground" />
          ) : (
            <BsBuilding className="text-muted-foreground" />
          )}
          <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs">
            {isStudent ? item.program : item.department}
          </span>
        </div>
      </TableCell>
      {isStudent && (
        <TableCell>
          <div className="flex items-center gap-2 text-sm">
            <BsCalendar3 className="text-muted-foreground" />
            <span>{item.year}</span>
          </div>
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center">
          <Badge
            variant={item.active ? "success" : "outline"}
            withDot
            dotColor={item.active ? "#16a34a" : "#9ca3af"}
          >
            {item.active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1.5 justify-end items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="View"
            title="View"
            onClick={() => onView && onView(item)}
          >
            <BsEye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="History"
            title="History"
            onClick={() => onHistory && onHistory(item)}
          >
            <BsClockHistory className="h-4 w-4" />
          </Button>
          <Button
            variant={item.active ? "destructive" : "default"}
            size="icon"
            aria-label={item.active ? "Deactivate" : "Activate"}
            title={item.active ? "Deactivate" : "Activate"}
            onClick={() => onToggleActive && onToggleActive(item)}
          >
            {item.active ? (
              <BsSlashCircle className="h-4 w-4" />
            ) : (
              <BsCheckCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
