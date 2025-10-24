import React from "react";
import { BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsCheckCircle, BsClockHistory, BsXCircle, BsTrash } from "react-icons/bs";
import { Card, CardHeader, CardContent, CardFooter } from "../../../lightswind/card";
import { Badge } from "../../../lightswind/badge";
import { Button } from "../../../lightswind/button";
import "../../student/ConsultationCard.css";
import "./AdvisorConsultationCard.css";

function AdvisorConsultationCard({ consultation, onActionClick, onDelete, onApprove, onDecline }) {
  const isParsableDate = (value) => {
    if (!value) return false;
    const d = new Date(value);
    return !isNaN(d.getTime());
  };

  const formatDate = (c) => {
    if (isParsableDate(c.date)) {
      const d = new Date(c.date);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
    if (c.day && c.date) {
      return `${c.day} ${c.date}`;
    }
    return '';
  };

  const getStatusInfo = () => {
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
      default:
        return { text: 'Unknown', icon: <BsClockHistory />, class: 'status-pending' };
    }
  };

  const getActionButtonText = () => {
    if (consultation.status === 'pending') {
      return 'Approve';
    } else if (consultation.mode === 'online') {
      return 'Start';
    } else {
      return 'Details';
    }
  };

  const getActionButtonClass = () => {
    if (consultation.status === 'pending') {
      return 'consultation-card-action-btn online'; // green approve
    } else if (consultation.mode === 'online') {
      return 'consultation-card-action-btn online';
    } else {
      return 'consultation-card-action-btn in-person';
    }
  };

  const shouldShowSingleAction = () => {
    // For pending, we'll show dual actions (Approve/Decline). Others single.
    return consultation.status !== 'pending' && consultation.status !== 'declined';
  };

  const statusInfo = getStatusInfo();

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

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(consultation);
  };

  return (
    <Card hoverable className="advisor-consultation-card-new h-full flex flex-col">
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
        <h3 className="text-lg font-semibold text-gray-900 leading-tight">{consultation.topic}</h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <BsClock className="w-4 h-4 text-blue-600" />
          <span>{formatDate(consultation)} • {consultation.time}</span>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg flex-shrink-0">
            {(consultation.student && consultation.student.avatar) || <BsPersonCircle />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{consultation.student?.name || 'Student'}</div>
            <div className="text-xs text-gray-600 truncate">{consultation.student?.title || 'Student'}</div>
          </div>
        </div>
        
        {consultation.mode === 'in-person' && consultation.location && (
          <div className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <BsGeoAlt className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="truncate">{consultation.location}</span>
          </div>
        )}
        
        {consultation.status === 'declined' && consultation.declineReason && (
          <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="text-xs font-semibold text-red-700 mb-1">Reason:</div>
            <div className="text-xs text-red-600">{consultation.declineReason}</div>
          </div>
        )}
      </CardContent>

      {shouldShowSingleAction() && (
        <CardFooter className="pt-3 gap-2" align="between">
          <Button size="sm" className="flex-1" onClick={handlePrimaryClick}>
            {getActionButtonText()}
            <BsChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </CardFooter>
      )}

      {consultation.status === 'pending' && (
        <CardFooter className="pt-3 gap-2" align="between">
          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={handlePrimaryClick}>
            Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={handleDecline}>
            Decline
          </Button>
        </CardFooter>
      )}

      {consultation.status === 'declined' && (
        <CardFooter className="pt-3 gap-2" align="between">
          <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50" onClick={handleDelete}>
            <BsTrash className="w-4 h-4" />
          </Button>
          <Button size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={() => onActionClick?.(consultation)}>
            Review
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default AdvisorConsultationCard;
