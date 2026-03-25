import React from "react";
import { PersonCircleIcon, VideoCameraIcon, MapPinIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from "../icons/Heroicons";


import { Card, CardHeader, CardContent, CardFooter } from "../../lightswind/card";
import { Badge } from "../../lightswind/badge";
import { Button } from "../../lightswind/button";
import "./ConsultationCard.css";

function ConsultationCard({ consultation, onActionClick, onDelete, onCancel, onReschedule, onMarkMissed }) {
  const formatDate = (dateStringOrIso) => {
    const src = String(consultation?.start_datetime || dateStringOrIso || '').trim();
    if (!src) return '';
    const cleaned = src.replace(' ', 'T');
    const d = new Date(`${cleaned}Z`);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  const getStatusInfo = () => {
    const inSession = String(consultation.status) === 'approved' && !!consultation.actual_start_datetime && !consultation.actual_end_datetime;
    if (inSession) {
      return { text: 'In Session', icon: <ClockIcon className="w-4 h-4" />, class: 'status-insession' };
    }
    switch (consultation.status) {
      case 'approved':
        return { text: 'Approved', icon: <CheckCircleIcon className="w-4 h-4" />, class: 'status-approved' };
      case 'pending':
        return { text: 'Awaiting Approval', icon: <ClockIcon className="w-4 h-4" />, class: 'status-pending' };
      case 'declined':
        return { text: 'Declined', icon: <XCircleIcon className="w-4 h-4" />, class: 'status-declined' };
      case 'expired':
        return { text: 'Expired', icon: <ClockIcon className="w-4 h-4" />, class: 'status-expired' };
      case 'completed':
        return { text: 'Completed', icon: <CheckCircleIcon className="w-4 h-4" />, class: 'status-completed' };
      case 'incomplete':
        return { text: 'Incomplete', icon: <ClockIcon className="w-4 h-4" />, class: 'status-missed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <XCircleIcon className="w-4 h-4" />, class: 'status-cancelled' };
      case 'missed':
        return { text: 'Missed', icon: <ClockIcon className="w-4 h-4" />, class: 'status-missed' };
      default:
        return { text: 'Unknown', icon: <ClockIcon className="w-4 h-4" />, class: 'status-pending' };
    }
  };

  const getActionButtonText = () => {
    if (consultation.status === 'pending') {
      return 'Cancel';
    } else {
      return 'View Details';
    }
  };

  const getActionButtonClass = () => {
    if (consultation.status === 'pending') {
      return 'consultation-card-action-btn cancel';
    } else {
      return 'consultation-card-action-btn details';
    }
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

  const shouldShowActionButton = () => {
    return consultation.status !== 'declined';
  };

  

  const handleRescheduleConsultation = (e) => {
    e.stopPropagation();
    if (onReschedule) {
      onReschedule(consultation);
    } else {
      console.log('Reschedule consultation:', consultation.id);
    }
  };

  const handleCancelConsultation = (e) => {
    e.stopPropagation();
    if (onCancel) {
      onCancel(consultation);
    }
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
  const statusLc = String(consultation.status || '').toLowerCase();

  return (
    <Card hoverable className="consultation-card-new flex flex-col">
      <CardHeader spacing="compact" className="flex-row justify-between items-start pb-2">
        <Badge 
          variant={
            consultation.status === 'approved' ? 'default' : 
            consultation.status === 'pending' ? 'warning' : 
            consultation.status === 'completed' ? 'success' :
            consultation.status === 'incomplete' ? 'warning' :
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
          <h3 className="text-base font-semibold text-gray-900 leading-tight">{consultation.topic || consultation.title || 'No Title'}</h3>
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
          <span>{formatDate(consultation.date)} • {consultation.time}</span>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
            {(() => {
              const avatar = consultation?.advisor?.avatar_url || consultation?.faculty?.avatar;
              if (avatar) {
                return <img src={avatar} alt={consultation?.advisor?.name || consultation?.faculty?.name || 'Advisor'} className="w-full h-full object-cover" />;
              }
              return <PersonCircleIcon className="w-5 h-5" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{consultation?.advisor?.name || consultation?.faculty?.name || 'Advisor'}</div>
            <div className="text-xs text-gray-600 truncate">{consultation?.advisor?.title || consultation?.faculty?.title || ''}</div>
            <div className="text-xs text-gray-500 truncate">{consultation?.advisor?.department || consultation?.faculty?.department || ''}</div>
          </div>
        </div>
        
        {/* Location badge for in-person */}
        {consultation.mode === 'in-person' && consultation.location && (
          <div className="flex items-center gap-2 text-xs text-gray-700 p-1.5 bg-amber-50 border border-amber-200 rounded-md">
            <BsGeoAlt className="w-3 h-3 text-amber-600 flex-shrink-0" />
            <span className="truncate">{consultation.location}</span>
          </div>
        )}
        
        {/* Decline reason section */}
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
            || consultation.declineRemarks 
            || consultation.remarks 
            || consultation.reason;
          return (statusLc === 'declined' || rsStatus === 'declined') && declineText ? (
            <div className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="text-xs font-semibold text-red-700 mb-0.5">Reason:</div>
              <div className="text-xs text-red-600">{prettyReason(declineText)}</div>
            </div>
          ) : null;
        })()}

        {/* Cancellation reason section */}
        {(() => {
          const cancelText = rs.reason 
            || consultation.cancelReason 
            || consultation.cancel_reason 
            || consultation.cancellation_reason 
            || consultation.advisor_cancel_reason 
            || consultation.student_cancel_reason 
            || consultation.canceled_reason 
            || consultation.cancel_notes 
            || consultation.cancel_message 
            || consultation.cancellation_reason_text 
            || consultation.cancellationReason 
            || consultation.cancellationNotes 
            || consultation.remarks 
            || consultation.reason;
          return (statusLc === 'cancelled' || statusLc === 'canceled' || rsStatus === 'cancelled' || rsStatus === 'canceled') && cancelText ? (
            <div className="p-2 bg-amber-50 border-l-4 border-amber-400 rounded">
              <div className="text-xs font-semibold text-amber-800 mb-0.5">Cancelled:</div>
              <div className="text-xs text-amber-700">{prettyReason(cancelText)}</div>
            </div>
          ) : null;
        })()}

        {(() => {
          const incompleteText = rs.reason
            || consultation.incompleteReason
            || consultation.incomplete_reason
            || consultation.incompleteNotes
            || consultation.incomplete_notes
            || consultation.reason;
          return (statusLc === 'incomplete' || rsStatus === 'incomplete') && incompleteText ? (
            <div className="p-2 bg-amber-50 border-l-4 border-amber-500 rounded">
              <div className="text-xs font-semibold text-amber-800 mb-0.5">Incomplete:</div>
              <div className="text-xs text-amber-700">{prettyReason(incompleteText)}</div>
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
      {consultation.status === 'approved' && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={onActionClick}>
            {consultation.mode === 'online' ? 'Join' : 'Details'}
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleCancelConsultation}>
            <XCircleIcon className="w-4 h-4" />
          </Button>
          {canMarkMissed() && onMarkMissed && (
            <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => onMarkMissed(consultation)}>
              Mark Missed
            </Button>
          )}
        </CardFooter>
      )}
      
      {consultation.status === 'pending' && (
        <CardFooter className="pt-2 gap-2 justify-center" align="center">
          <Button size="sm" variant="outline" className="w-full text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={handleCancelConsultation}>
            Cancel
            <XCircleIcon className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      )}
      
      {(consultation.status === 'declined' || consultation.status === 'expired' || consultation.status === 'missed' || consultation.status === 'cancelled' || consultation.status === 'incomplete') && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button size="sm" variant="ghost" className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={handleRescheduleConsultation}>
            Reschedule
          </Button>
        </CardFooter>
      )}

      {(consultation.status === 'completed' || consultation.status === 'incomplete') && (
        <CardFooter className="pt-2 gap-2" align="between">
          <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={onActionClick}>
            View Details
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      )}
      
      {/* completed still shows details; other statuses handled above */}
    </Card>
  );
}

export default ConsultationCard;
