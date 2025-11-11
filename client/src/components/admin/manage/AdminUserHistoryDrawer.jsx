import React, { useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../../../lightswind/drawer";
import { Badge } from "../../../lightswind/badge";
import { Button } from "../../../lightswind/button";

export default function AdminUserHistoryDrawer({ open, user, consultations = [], onClose, onDelete }) {
  const [selected, setSelected] = useState(null);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return { text: 'Completed', variant: 'success' };
      case 'cancelled':
        return { text: 'Cancelled', variant: 'destructive' };
      case 'missed':
        return { text: 'Missed', variant: 'warning' };
      default:
        return { text: 'Completed', variant: 'success' };
    }
  };
  const { completedCount, cancelledCount, missedCount } = useMemo(() => {
    const counts = { completedCount: 0, cancelledCount: 0, missedCount: 0 };
    consultations.forEach((c) => {
      if (c.status === "completed") counts.completedCount += 1;
      else if (c.status === "cancelled") counts.cancelledCount += 1;
      else if (c.status === "missed") counts.missedCount += 1;
    });
    return counts;
  }, [consultations]);

  return (
    <Drawer open={open} onOpenChange={(v) => {
      if (!v) {
        onClose && onClose();
        setSelected(null);
      }
    }}>
      <DrawerContent className="max-w-3xl p-0 h-[80vh] flex flex-col overflow-hidden">
        <DrawerHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
          <div className="flex items-start justify-between w-full">
            <div>
              <DrawerTitle>Consultation History</DrawerTitle>
              {user?.name && (
                <p className="text-sm text-gray-500 mt-1">{user.name}</p>
              )}
            </div>
            {selected && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Back to list</Button>
              </div>
            )}
          </div>
        </DrawerHeader>

        {/* Stats Banner */}
        {consultations && consultations.length > 0 && (
          <div className="history-stats-banner">
            <div className="stat-item">
              <div className="stat-value">{consultations.length}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item stat-completed">
              <div className="stat-value">{completedCount}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item stat-cancelled">
              <div className="stat-value">{cancelledCount}</div>
              <div className="stat-label">Cancelled</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item stat-missed">
              <div className="stat-value">{missedCount}</div>
              <div className="stat-label">Missed</div>
            </div>
          </div>
        )}

        <div className="p-4 flex-1 overflow-y-auto">
          {!consultations || consultations.length === 0 ? (
            <div className="empty-state">
              <strong>No consultation history</strong>
              <p className="text-sm mt-2">This user hasn't had any consultations yet.</p>
            </div>
          ) : selected ? (
            <div className="space-y-3">
              {/* Details view */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Consultation Details</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Back</Button>
                </div>
              </div>
              <div className="border rounded-md p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Badge variant={getStatusInfo(selected.status).variant}>{getStatusInfo(selected.status).text}</Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{selected.topic}</div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {formatDate(selected.date)} • {selected.time} • {selected.mode === 'online' ? 'Online' : 'In-Person'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selected.faculty?.name || 'Advisor/Student'} {selected.faculty?.title ? `• ${selected.faculty.title}` : ''}
                    </div>
                    {selected.mode === 'in-person' && selected.location && (
                      <div className="text-xs text-gray-700 mt-1">📍 {selected.location}</div>
                    )}
                  </div>
                </div>
                {/* Summary and notes */}
                {(selected.summaryNotes || selected.aiSummary) && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700">Summary</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.summaryNotes || selected.aiSummary}</p>
                  </div>
                )}
                {selected.studentPrivateNotes && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700">Student Notes</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.studentPrivateNotes}</p>
                  </div>
                )}
                {selected.advisorPrivateNotes && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700">Advisor Notes</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.advisorPrivateNotes}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-end gap-2">
                  {onDelete && (
                    <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => onDelete(selected)}>
                      Delete
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setSelected(null)}>Close</Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <ul className="divide-y divide-gray-200">
                {consultations.map((c) => {
                  const statusInfo = getStatusInfo(c.status);
                  return (
                    <li key={c.id} className="p-3 flex items-start gap-3">
                      <div className="flex-shrink-0 pt-0.5">
                        <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{c.topic}</div>
                        <div className="text-xs text-gray-600 mt-0.5 truncate">
                          {formatDate(c.date)} • {c.time} • {c.mode === 'online' ? 'Online' : 'In-Person'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {c.faculty?.name || 'Advisor/Student'} • {c.faculty?.title || ''}
                        </div>
                        {c.mode === 'in-person' && c.location && (
                          <div className="text-xs text-gray-700 mt-1 truncate">📍 {c.location}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {onDelete && (
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => onDelete(c)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}