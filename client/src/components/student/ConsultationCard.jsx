import React from "react";
import { BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsCheckCircle, BsClockHistory, BsXCircle, BsTrash } from "react-icons/bs";
import { Card, CardHeader, CardContent, CardFooter } from "../../lightswind/card";
import { Badge } from "../../lightswind/badge";
import { Button } from "../../lightswind/button";
import "./ConsultationCard.css";

function ConsultationCard({ consultation, onActionClick, onDelete, onCancel, onReschedule, onMarkMissed }) {
  const formatDate = (dateStringOrIso) => {
    const source = consultation?.start_datetime || dateStringOrIso;
    const date = new Date(source);
    const fmt = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return fmt.format(date);
  };

  const getStatusInfo = () => {
    const inSession = String(consultation.status) === 'approved' && !!consultation.actual_start_datetime && !consultation.actual_end_datetime;
    if (inSession) {
      return { text: 'In Session', icon: <BsClock />, class: 'status-insession' };
    }
    switch (consultation.status) {
      case 'approved':
        return { text: 'Approved', icon: <BsCheckCircle />, class: 'status-approved' };
      case 'pending':
        return { text: 'Awaiting Approval', icon: <BsClockHistory />, class: 'status-pending' };
      case 'declined':
        return { text: 'Declined', icon: <BsXCircle />, class: 'status-declined' };
      case 'completed':
        return { text: 'Completed', icon: <BsCheckCircle />, class: 'status-completed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <BsXCircle />, class: 'status-cancelled' };
      case 'missed':
        return { text: 'Missed', icon: <BsClockHistory />, class: 'status-missed' };
      default:
        return { text: 'Unknown', icon: <BsClockHistory />, class: 'status-pending' };
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
    const start = new Date(startRaw);
    if (isNaN(start.getTime())) return false;
    const durationMin = consultation.duration || consultation.duration_minutes || 30;
    const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
    return Date.now() >= (start.getTime() + graceMs);
  };

  const shouldShowActionButton = () => {
    return consultation.status !== 'declined';
  };

  const handleDeleteConsultation = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(consultation);
    }
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

  return (
    <Card hoverable className="consultation-card-new flex flex-col">
      <CardHeader spacing="compact" className="flex-row justify-between items-start pb-3">
        <Badge 
          variant={
            consultation.status === 'approved' ? 'default' : 
            consultation.status === 'pending' ? 'warning' : 
            consultation.status === 'completed' ? 'success' :
            'destructive'
          } 
          className="flex items-center gap-1.5"
        >
          {statusInfo.icon}
          {statusInfo.text}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1.5">
          {consultation.mode === 'online' ? <BsCameraVideo className="w-3.5 h-3.5" /> : <BsGeoAlt className="w-3.5 h-3.5" />}
          {consultation.mode === 'online' ? 'Online' : 'In-Person'}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-3 flex-1">
        <h3 className="text-lg font-semibold text-gray-900 leading-tight">{consultation.category || consultation.topic || 'No Topic'}</h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{formatDate(consultation.date)} • {consultation.time}</span>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
            {consultation?.faculty?.avatar ? (
              <img src={consultation.faculty.avatar} alt="Advisor" className="w-full h-full object-cover" />
            ) : (
              <BsPersonCircle className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{consultation?.faculty?.name || 'Advisor'}</div>
            <div className="text-xs text-gray-600 truncate">{consultation?.faculty?.title || ''}</div>
          </div>
        </div>
        
        {/* Location badge for in-person */}
        {consultation.mode === 'in-person' && consultation.location && (
          <div className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <BsGeoAlt className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="truncate">{consultation.location}</span>
          </div>
        )}
        
        {/* Decline reason section */}
        {consultation.status === 'declined' && consultation.declineReason && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="text-xs font-semibold text-red-700 mb-1">Reason:</div>
            <div className="text-xs text-red-600">{consultation.declineReason}</div>
          </div>
        )}
      </CardContent>
      
      {consultation.status === 'approved' && (
        <CardFooter className="pt-3 gap-2" align="between">
          <Button size="sm" className="flex-1" onClick={onActionClick}>
            {consultation.mode === 'online' ? 'Join' : 'Details'}
            <BsChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleCancelConsultation}>
            <BsXCircle className="w-4 h-4" />
          </Button>
          {canMarkMissed() && onMarkMissed && (
            <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => onMarkMissed(consultation)}>
              Mark Missed
            </Button>
          )}
        </CardFooter>
      )}
      
      {consultation.status === 'pending' && (
        <CardFooter className="pt-3 gap-2 justify-center" align="center">
          <Button size="sm" variant="outline" className="w-full text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={handleCancelConsultation}>
            Cancel
            <BsXCircle className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      )}
      
      {consultation.status === 'declined' && (
        <CardFooter className="pt-3 gap-2" align="between">
          <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50" onClick={handleDeleteConsultation}>
            <BsTrash className="w-4 h-4" />
          </Button>
          <Button size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={handleRescheduleConsultation}>
            Reschedule
          </Button>
        </CardFooter>
      )}
      
      {consultation.status === 'completed' && (
        <CardFooter className="pt-3 gap-2" align="between">
          <Button size="sm" className="flex-1" onClick={onActionClick}>
            View Details
            <BsChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleDeleteConsultation}>
            <BsTrash className="w-4 h-4" />
          </Button>
        </CardFooter>
      )}
      
      {consultation.status === 'cancelled' && (
        <CardFooter className="pt-3 gap-2" align="between">
          <Button size="sm" className="flex-1" onClick={onActionClick}>
            View Details
            <BsChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleDeleteConsultation}>
            <BsTrash className="w-4 h-4" />
          </Button>
        </CardFooter>
      )}

      {consultation.status === 'missed' && (
        <CardFooter className="pt-3 gap-2" align="between">
          <Button size="sm" className="flex-1" onClick={onActionClick}>
            View Details
            <BsChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleDeleteConsultation}>
            <BsTrash className="w-4 h-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default ConsultationCard;
