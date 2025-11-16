import React from "react";
import { BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsCheckCircle, BsXCircle, BsChevronRight } from "react-icons/bs";
import { Card, CardHeader, CardContent, CardFooter } from "../../../lightswind/card";
import { Badge } from "../../../lightswind/badge";
import { Button } from "../../../lightswind/button";
import "./AdvisorHistoryCard.css";

function AdvisorHistoryCard({ consultation, onViewDetails, onDelete }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusInfo = () => {
    switch (consultation.status) {
      case 'completed':
        return { text: 'Completed', icon: <BsCheckCircle />, class: 'status-completed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <BsXCircle />, class: 'status-cancelled' };
      case 'missed':
        return { text: 'Missed', icon: <BsClock />, class: 'status-missed' };
      default:
        return { text: 'Completed', icon: <BsCheckCircle />, class: 'status-completed' };
    }
  };

  const getActionButtonText = () => {
    return 'View Details';
  };

  const getActionButtonClass = () => {
    return 'history-card-action-btn view-details';
  };

  const statusInfo = getStatusInfo();

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(consultation);
    }
  };

  

  return (
    <Card hoverable className="advisor-history-card-new h-full flex flex-col">
      <CardHeader spacing="compact" className="flex-row justify-between items-start pb-3">
        <Badge 
          variant={
            consultation.status === 'completed' ? 'success' : 
            consultation.status === 'cancelled' ? 'destructive' : 
            'success'
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
          <span>{formatDate(consultation.date)} • {consultation.time}</span>
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
      </CardContent>

      <CardFooter className="pt-3 gap-2" align="between">
        <Button size="sm" className="flex-1" onClick={handleViewDetails}>
          View Details
          <BsChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default AdvisorHistoryCard;
