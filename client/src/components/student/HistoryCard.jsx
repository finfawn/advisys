import React from "react";
import { ClockIcon, PersonCircleIcon, VideoCameraIcon, MapPinIcon, CheckCircleIcon, XCircleIcon, ChevronRightIcon } from "../icons/Heroicons";
import { Card, CardHeader, CardContent, CardFooter } from "../../lightswind/card";
import { Badge } from "../../lightswind/badge";
import { Button } from "../../lightswind/button";
import "./HistoryCard.css";

function HistoryCard({ consultation, onViewDetails, onDelete }) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const s = String(dateString).trim();
    // Use T00:00:00Z to ensure a date-only string is parsed as UTC midnight
    const d = new Date(s.includes('T') ? s : `${s}T00:00:00Z`);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-PH', { 
      timeZone: 'Asia/Manila',
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };


  const getStatusInfo = () => {
    switch (consultation.status) {
      case 'completed':
        return { text: 'Completed', icon: <CheckCircleIcon className="w-4 h-4" />, class: 'status-completed' };
      case 'incomplete':
        return { text: 'Incomplete', icon: <ClockIcon className="w-4 h-4" />, class: 'status-missed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <XCircleIcon className="w-4 h-4" />, class: 'status-cancelled' };
      case 'missed':
        return { text: 'Missed', icon: <ClockIcon className="w-4 h-4" />, class: 'status-missed' };
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
    <Card hoverable className="history-card-new h-full flex flex-col">
      <CardHeader spacing="compact" className="flex-row justify-between items-start pb-3">
        <Badge 
          variant={
            consultation.status === 'completed' ? 'success' : 
            consultation.status === 'incomplete' ? 'warning' :
            consultation.status === 'cancelled' ? 'destructive' : 
            consultation.status === 'missed' ? 'warning' :
            'success'
          } 
          className="flex items-center gap-1.5"
        >
          {statusInfo.icon}
          {statusInfo.text}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1.5">
          {consultation.mode === 'online' ? <VideoCameraIcon className="w-3.5 h-3.5" /> : <MapPinIcon className="w-3.5 h-3.5" />}
          {consultation.mode === 'online' ? 'Online' : 'In-Person'}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-3 flex-1">
        <h3 className="text-lg font-semibold text-gray-900 leading-tight">{consultation.topic}</h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ClockIcon className="w-4 h-4 text-[#3360c2]" />
          <span>{formatDate(consultation.date)} • {consultation.time}</span>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="w-10 h-10 rounded-full bg-[#3360c2] text-white flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
            {consultation?.faculty?.avatar ? (
              typeof consultation.faculty.avatar === 'string' && consultation.faculty.avatar.startsWith('http') ? (
                <img src={consultation.faculty.avatar} alt={consultation?.faculty?.name || 'Advisor'} className="w-full h-full object-cover" />
              ) : (
                // If avatar is not a URL (e.g., emoji or initial), render it directly
                <span className="text-base leading-none">{consultation.faculty.avatar}</span>
              )
            ) : (
              <PersonCircleIcon className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{consultation?.faculty?.name || 'Advisor'}</div>
            <div className="text-xs text-gray-600 truncate">{consultation?.faculty?.title || ''}</div>
          </div>
        </div>
        
        {consultation.mode === 'in-person' && consultation.location && (
          <div className="flex items-center gap-2 text-sm text-gray-700 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <MapPinIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="truncate">{consultation.location}</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-3 gap-2" align="between">
        <Button size="sm" className="flex-1" onClick={handleViewDetails}>
          View Details
          <ChevronRightIcon className="w-4 h-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default HistoryCard;
