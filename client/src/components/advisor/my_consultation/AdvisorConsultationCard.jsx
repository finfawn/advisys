import React from "react";
import { 
  PersonCircleIcon, VideoCameraIcon, MapPinIcon, ChevronRightIcon, 
  CheckCircleIcon, ClockIcon, XCircleIcon 
} from "../../../components/icons/Heroicons";
import { Card, CardHeader, CardContent, CardFooter } from "../../../lightswind/card";
import { Badge } from "../../../lightswind/badge";
import { Button } from "../../../lightswind/button";
import { Avatar, AvatarImage, AvatarFallback } from "../../../lightswind/avatar";
import "../../student/ConsultationCard.css";
import "./AdvisorConsultationCard.css";

function AdvisorConsultationCard({ consultation, onActionClick, onDelete, onApprove, onDecline, onMarkMissed }) {
  const findReason = (obj, kind /* 'decline' | 'cancel' */) => {
    try {
      if (!obj || typeof obj !== 'object') return null;
      const stack = [obj];
      const kw = kind === 'decline' ? 'declin' : 'cancel';
      while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== 'object') continue;
        for (const [k, v] of Object.entries(cur)) {
          const lk = String(k).toLowerCase();
          if ((lk.includes(kw) && (lk.includes('reason') || lk.includes('note') || lk.includes('message'))) || (lk === 'reason' && kw === 'declin')) {
            const s = String(v ?? '').trim();
            if (s) return s;
          }
          if (v && typeof v === 'object') stack.push(v);
        }
      }
    } catch {}
    return null;
  };
  const isParsableDate = (value) => {
    if (!value) return false;
    const d = new Date(value);
    return !isNaN(d.getTime());
  };

  const formatDate = (c) => {
    const raw = c.date;
    if (!raw) return '';
    const s = String(raw).trim();
    // Parse date-only string as UTC midnight to avoid local-time day shifts
    const d = new Date(s.includes('T') ? s : `${s}T00:00:00Z`);
    if (isNaN(d.getTime())) {
      return (c.day && c.date) ? `${c.day} ${c.date}` : (c.date || '');
    }
    return d.toLocaleDateString('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusInfo = () => {
    const inSession = String(consultation.status) === 'approved' && !!consultation.actual_start_datetime && !consultation.actual_end_datetime;
    if (inSession) {
      return { text: 'In Session', icon: <ClockIcon />, class: 'status-insession' };
    }
    switch (consultation.status) {
      case 'approved':
        return { text: 'Approved', icon: <CheckCircleIcon />, class: 'status-approved' };
      case 'pending':
        return { text: 'Awaiting Approval', icon: <ClockIcon />, class: 'status-pending' };
      case 'declined':
        return { text: 'Declined', icon: <XCircleIcon />, class: 'status-declined' };
      case 'expired':
        return { text: 'Expired', icon: <ClockIcon />, class: 'status-expired' };
      case 'completed':
        return { text: 'Completed', icon: <CheckCircleIcon />, class: 'status-completed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <XCircleIcon />, class: 'status-cancelled' };
      case 'missed':
        return { text: 'Missed', icon: <ClockIcon />, class: 'status-missed' };
      default:
        return { text: 'Unknown', icon: <ClockIcon />, class: 'status-pending' };
    }
  };

  const getActionButtonText = () => {
    if (consultation.status === 'pending') {
      return 'Approve';
    }
    if (consultation.status === 'completed' || consultation.status === 'declined') {
      return 'View Details';
    }
    if (consultation.status === 'cancelled' || consultation.status === 'missed' || consultation.status === 'expired') {
      return 'Reschedule';
    }
    if (consultation.status === 'approved') {
      return consultation.mode === 'online' ? 'Start' : 'Details';
    }
    return 'Details';
  };

  const getActionButtonClass = () => {
    if (consultation.status === 'pending') return 'consultation-card-action-btn online';
    if (consultation.status === 'approved' && consultation.mode === 'online') return 'consultation-card-action-btn online';
    return 'consultation-card-action-btn in-person';
  };

  const shouldShowSingleAction = () => {
    return consultation.status !== 'pending' && consultation.status !== 'declined' && consultation.status !== 'completed' && consultation.status !== 'missed' && consultation.status !== 'expired';
  };

  const statusInfo = getStatusInfo();
  const rs = consultation.request_status || {};
  const rsStatus = String(rs.status || consultation.status || '').toLowerCase();
  const prettyReason = (x) => {
    if (x == null) return '';
    const s = String(x).trim();
    if (!s) return '';
    if (s.length <= 60 && /^[A-Za-z0-9 _-]+$/.test(s)) {
      const normalized = s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      const key = normalized.toLowerCase();
      const map = {
        'schedule conflict': 'Schedule conflict',
        'no longer needed': 'No longer needed',
        'found alternative': 'Found alternative solution',
        'emergency': 'Emergency/Personal issue',
        'emergency personal issue': 'Emergency/Personal issue',
      };
      if (map[key]) return map[key];
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
    return s;
  };

  const handlePrimaryClick = (e) => {
    e.stopPropagation();
    if (consultation.status === 'pending') {
      onApprove?.(consultation);
    } else {
      onActionClick?.(consultation);
    }
  };

  const handleDecline = (e) => {
    e.stopPropagation();
    onDecline?.(consultation);
  };

  

  const canMarkMissed = () => {
    if (consultation.status !== 'approved') return false;
    const startRaw = consultation.start_datetime || consultation.date;
    if (!startRaw) return false;
    const s = String(startRaw).trim();
    const hasTZ = /([zZ]|[+\-]\d{2}:?\d{2})$/.test(s);
    const cleaned = s.replace(' ', 'T');
    const start = hasTZ ? new Date(cleaned) : new Date(`${cleaned}Z`);
    if (isNaN(start.getTime())) return false;
    const durationMin = consultation.duration || consultation.duration_minutes || 30;
    const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
    return Date.now() >= (start.getTime() + graceMs);
  };

  return (
    <Card hoverable className="consultation-card-new advisor-consultation-card-new flex flex-col">
      <CardHeader spacing="compact" className="flex-row justify-between items-start pb-2">
        <Badge 
          variant={
            consultation.status === 'approved' ? 'default' : 
            consultation.status === 'pending' ? 'warning' : 
            consultation.status === 'completed' ? 'success' :
            'destructive'
          } 
          className="flex items-center gap-1 text-xs"
        >
          {statusInfo.icon}
          {statusInfo.text}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          {consultation.mode === 'online' ? <VideoCameraIcon className="w-3 h-3" /> : <MapPinIcon className="w-3 h-3" />}
          {consultation.mode === 'online' ? 'Online' : 'In-Person'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 leading-tight">{consultation.topic || consultation.title || 'No Topic'}</h3>
          {(() => {
            const displayCat = consultation.category || 'General';
            
            return (
              <Badge variant="secondary" className="text-xs flex-shrink-0 bg-gray-500 hover:bg-gray-600 text-white border-0 px-2 shadow-sm">
                {displayCat}
              </Badge>
            );
          })()}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{formatDate(consultation)} • {consultation.time}</span>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
          <Avatar className="w-8 h-8 flex-shrink-0 border border-gray-200 shadow-sm">
            <AvatarImage 
              src={consultation?.student?.avatar} 
              alt={consultation.student?.name || 'Student'} 
            />
            <AvatarFallback name={consultation.student?.name} />
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{consultation.student?.name || 'Student'}</div>
            <div className="text-xs text-gray-600 truncate">{consultation.student?.title ?? consultation.student?.course ?? 'Student'}</div>
          </div>
        </div>
        
        {consultation.mode === 'in-person' && consultation.location && (
          <div className="flex items-center gap-2 text-xs text-gray-700 p-1.5 bg-amber-50 border border-amber-200 rounded-md">
            <MapPinIcon className="w-3 h-3 text-amber-600 flex-shrink-0" />
            <span className="truncate">{consultation.location}</span>
          </div>
        )}
        
        {(() => {
          const declineText = rs.reason 
            || consultation.declineReason 
            || consultation.decline_reason 
            || consultation.advisor_decline_reason 
            || consultation.declined_reason 
            || consultation.decline_reason_text 
            || consultation.decline_note 
            || consultation.decline_notes 
            || consultation.decline_message 
            || consultation.reason 
            || findReason(consultation, 'decline');
          const statusLc = String(consultation.status).toLowerCase();
          return (statusLc === 'declined' || rsStatus === 'declined') && declineText ? (
            <div className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="text-xs font-semibold text-red-700 mb-0.5">Reason:</div>
              <div className="text-xs text-red-600">{prettyReason(declineText)}</div>
            </div>
          ) : null;
        })()}

        {(() => {
          const cancelText = consultation.cancelReason 
            || consultation.cancel_reason 
            || consultation.cancellation_reason 
            || consultation.advisor_cancel_reason 
            || consultation.student_cancel_reason 
            || consultation.canceled_reason 
            || consultation.cancel_notes 
            || consultation.cancel_message 
            || consultation.cancellation_reason_text 
            || findReason(consultation, 'cancel');
          const statusLc = String(consultation.status).toLowerCase();
          return (statusLc === 'cancelled' || statusLc === 'canceled' || rsStatus === 'cancelled' || rsStatus === 'canceled') && cancelText ? (
            <div className="p-2 bg-amber-50 border-l-4 border-amber-400 rounded">
              <div className="text-xs font-semibold text-amber-800 mb-0.5">Cancelled:</div>
              <div className="text-xs text-amber-700">{prettyReason(cancelText)}</div>
            </div>
          ) : null;
        })()}

        {(() => {
          const isApproved = String(rs.status || '').toLowerCase() === 'approved';
          const val = isApproved ? rs.value : null;
          if (!val) return null;
          const modeLc = String(consultation.mode || '').toLowerCase();
          const loc = consultation.location || consultation.roomName || consultation.room_name || '';
          if (modeLc === 'in-person' && String(loc).trim() && String(loc).trim() === String(val).trim()) return null;
          return (
            <div className="p-2 bg-gray-50 border rounded">
              <div className="text-xs font-semibold text-gray-700 mb-0.5">Value:</div>
              <div className="text-xs text-gray-700 truncate break-all">{val}</div>
            </div>
          );
        })()}
      </CardContent>

      {consultation.status === 'completed' && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button size="sm" className="flex-1" onClick={handlePrimaryClick}>
            View Details
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      )}

      {consultation.status === 'missed' && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button size="sm" variant="ghost" className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={() => onActionClick?.(consultation)}>
            Reschedule
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      )}

      {consultation.status !== 'completed' && consultation.status !== 'missed' && shouldShowSingleAction() && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button
            size="sm"
            className={`flex-1 ${consultation.status === 'cancelled' || consultation.status === 'missed' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            onClick={handlePrimaryClick}
          >
            {getActionButtonText()}
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
          {consultation.status === 'approved' && canMarkMissed() && onMarkMissed && (
            <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => onMarkMissed(consultation)}>
              Mark Missed
            </Button>
          )}
        </CardFooter>
      )}

      {consultation.status === 'pending' && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handlePrimaryClick}>
            Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={handleDecline}>
            Decline
          </Button>
        </CardFooter>
      )}

      {consultation.status === 'declined' && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={() => onActionClick?.(consultation)}>
            Reschedule
          </Button>
        </CardFooter>
      )}

      {consultation.status === 'expired' && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button size="sm" variant="ghost" className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={() => onActionClick?.(consultation)}>
            Reschedule
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default AdvisorConsultationCard;
