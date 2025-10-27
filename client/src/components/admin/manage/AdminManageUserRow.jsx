import React from "react";
import { BsPersonCircle, BsPerson, BsCalendar3 } from "react-icons/bs";
import { Button } from "../../../lightswind/button";
import { Badge } from "../../../lightswind/badge";

export default function AdminManageUserRow({ item, isStudent, onView, onHistory, onToggleActive }) {
  return (
    <div className={`manage-row ${item.active ? '' : 'inactive'}`}>
      <div className="col name-col">
        <span className="avatar"><BsPersonCircle /></span>
        <span className="name-text">{item.name}</span>
      </div>
      <div className="col role-col">
        <BsPerson style={{ fontSize: '18px' }} />
        <span>{isStudent ? 'Student' : 'Faculty'}</span>
      </div>
      <div className="col year-col">
        <BsCalendar3 style={{ fontSize: '16px' }} />
        <span>{isStudent ? item.year : '—'}</span>
      </div>
      <div className="col status-col">
        <Badge variant={item.active ? 'success' : 'outline'} withDot dotColor={item.active ? '#16a34a' : '#9ca3af'}>
          {item.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <div className="col actions-col">
        <Button variant="outline" size="sm" onClick={() => onView && onView(item)}>View</Button>
        <Button variant="secondary" size="sm" onClick={() => onHistory && onHistory(item)}>History</Button>
        <Button
          variant={item.active ? 'destructive' : 'default'}
          size="sm"
          onClick={() => onToggleActive && onToggleActive(item)}
        >
          {item.active ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </div>
  );
}
