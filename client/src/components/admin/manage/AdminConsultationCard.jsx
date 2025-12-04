import React from "react";
import { BsChevronRight } from "react-icons/bs";
import { Badge } from "../../../lightswind/badge";

export default function AdminConsultationCard({ consultation, onClick }) {
  const getStatusInfo = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'completed':
        return { text: 'Completed', variant: 'success' };
      case 'cancelled':
      case 'canceled':
        return { text: 'Cancelled', variant: 'destructive' };
      case 'missed':
        return { text: 'Missed', variant: 'warning' };
      case 'approved':
        return { text: 'Approved', variant: 'default' };
      case 'pending':
        return { text: 'Pending', variant: 'warning' };
      case 'declined':
        return { text: 'Declined', variant: 'destructive' };
      case 'expired':
        return { text: 'Expired', variant: 'warning' };
      default:
        return { text: 'Scheduled', variant: 'default' };
    }
  };

  const getInitials = (name) => {
    return String(name || '').split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  };

  const toDateUtc = (val) => {
    const s = String(val || '');
    const base = s.includes('T') ? s : s.replace(' ', 'T');
    const withSec = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(base) ? `${base}:00` : base;
    const hasTz = /([zZ]|[+\-]\d{2}:?\d{2})$/.test(s);
    const d = new Date(hasTz ? s : `${withSec}Z`);
    return d;
  };
  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(toDateUtc(dateString));
  };

  const getDisplayDate = (c) => {
    const v = c?.date || c?.scheduled_at || c?.scheduledAt || c?.start_time || c?.startTime || c?.datetime || c?.timestamp || c?.created_at || c?.createdAt || '';
    const date = new Date(v);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDisplayTime = (c) => {
    const v = c?.start_datetime || c?.scheduled_at || c?.scheduledAt || c?.start_time || c?.startTime || c?.datetime || c?.timestamp || c?.created_at || c?.createdAt || '';
    const date = new Date(v);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const statusInfo = getStatusInfo(consultation.status);
  const s = String(consultation?.status || '').toLowerCase();
  const subtle = s === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
               s === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
               s === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
               s === 'missed' ? 'bg-amber-50 text-amber-800 border-amber-200' : 
               (s === 'cancelled' || s === 'canceled') ? 'bg-red-50 text-red-700 border-red-200' : 
               'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div 
      className="bg-white rounded-lg border border-gray-100 p-3 flex items-center gap-3 hover:shadow-sm transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Avatar - Smaller size for list appearance */}
      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
        {consultation.faculty?.avatarUrl ? (
          <img 
            src={consultation.faculty.avatarUrl} 
            alt={consultation.faculty?.name || 'Profile'} 
            className="w-full h-full object-cover"
          />
        ) : (
          getInitials(consultation.faculty?.name || 'Advisor')
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            {/* Title - Smaller for compact layout */}
            <h3 className="text-base font-semibold text-gray-900 truncate leading-tight">
              {consultation.faculty?.name || 'Advisor'}
            </h3>
            
            {/* Subtitle - More compact */}
            <p className="text-sm text-gray-600 leading-tight">
              {consultation.faculty?.title || 'Academic Advisor'}
            </p>
            
            {/* Meta line - Single line approach */}
            <p className="text-xs text-gray-500 leading-tight">
              {consultation.mode === 'online' ? 'Online' : 'In-Person'} • {getDisplayDate(consultation)} at {getDisplayTime(consultation)}
            </p>
            
            {/* Location for in-person - More compact */}
            {consultation.mode === 'in-person' && consultation.location && (
              <p className="text-xs text-gray-600 leading-tight">📍 {consultation.location}</p>
            )}
          </div>

          {/* Status Badge and Chevron - More compact */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge 
              variant="outline" 
              className={`text-xs px-2 py-0.5 border ${subtle} font-medium`}
            >
              {statusInfo.text}
            </Badge>
            <BsChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
