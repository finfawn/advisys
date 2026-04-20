import React, { useEffect, useState } from "react";
import { ChevronRightIcon, CalendarDaysIcon } from "../icons/Heroicons";
import "./UpcomingConsultationsCard.css";
import { Card, CardHeader, CardTitle, CardContent } from "../../lightswind/card";
import { useNavigate } from "react-router-dom";
import { CompactConsultationSkeleton } from "../../lightswind/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "../../lightswind/avatar";

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
    weekday: 'short',
    month: 'short', 
    day: 'numeric' 
  }).format(toDateUtc(dateString));
};

const formatDateTimeLabel = (consultation) => {
  const dateLabel = consultation?.start_datetime
    ? formatDate(consultation.start_datetime)
    : (consultation?.date || '');
  const timeLabel = consultation?.time || '';
  return [dateLabel, timeLabel].filter(Boolean).join(' • ');
};

export default function UpcomingConsultationsCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState([]);

  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = localStorage.getItem('advisys_user');
        const storedToken = localStorage.getItem('advisys_token');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id || 1;
        const res = await fetch(`${base}/api/consultations/advisors/${advisorId}/consultations`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        });
        const data = await res.json();
        
        const now = new Date();
        const upcoming = (Array.isArray(data) ? data : [])
          .map(c => {
            const start = c.start_datetime ? new Date(c.start_datetime) : (c.date ? new Date(c.date) : null);
            const durationMin = c.duration || c.duration_minutes || 30;
            const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
            let status = c.status;
            let inGrace = false;
            if (start) {
              inGrace = now < (start.getTime() + graceMs);
              if (status === 'approved' && !inGrace && now >= (start.getTime() + graceMs)) {
                status = 'missed';
              }
            }
            return { ...c, _start: start, _inGrace: inGrace, status };
          })
          .filter(c => c.status === 'approved' && c._start && (c._start >= now || c._inGrace))
          .sort((a, b) => new Date(a._start) - new Date(b._start));
          
        setConsultations(upcoming);
      } catch (err) {
        console.error('Failed to load upcoming consultations', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUpcoming();
  }, []);

  const getActionButtonText = (index) => {
    // First upcoming item shows "Join" for quick action
    return index === 0 ? 'Join' : 'Details';
  };

  const getActionButtonClass = (index) => {
    return index === 0 ? 'upcoming-action-btn join' : 'upcoming-action-btn details';
  };

  const handleActionClick = (consultation, index) => {
    if (index === 0 && consultation.mode === 'online') {
      navigate(`/advisor-dashboard/consultations/online/${consultation.id}`, { state: { consultation } });
    } else {
      navigate(`/advisor-dashboard/consultations/${consultation.id}`, { state: { consultation } });
    }
  };

  return (
    <Card hoverable className="upcoming-consultations-card">
      <CardHeader spacing="default" className="pb-2">
        <div className="upcoming-card-header">
          <CardTitle size="default" className="upcoming-card-title">Upcoming Consultations</CardTitle>
          <button className="upcoming-view-all" onClick={() => navigate('/advisor-dashboard/consultations')}>
            View All
            <ChevronRightIcon className="view-all-icon" />
          </button>
        </div>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="upcoming-consultations-list">
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, idx) => (
                <CompactConsultationSkeleton key={`skeleton-${idx}`} variant="avatar" />
              ))}
            </>
          )}
          {consultations.length === 0 && !loading && (
            <div className="upcoming-empty">
              <CalendarDaysIcon className="upcoming-empty-icon" />
              <h4>No upcoming consultations</h4>
              <p>
                You don’t have any upcoming sessions. When students book with you,
                they will show up here.
              </p>
              <button 
                className="upcoming-empty-btn" 
                onClick={() => navigate('/advisor-dashboard/availability')}
              >
                Manage Availability
              </button>
            </div>
          )}
          {!loading && consultations.slice(0, 5).map((consultation, index) => (
            <div key={consultation.id} className="compact-consultation-card">
            <div className="compact-avatar-section">
              <Avatar className="compact-avatar">
                <AvatarImage src={consultation.student?.avatar_url} alt={consultation.student?.name} />
                <AvatarFallback name={consultation.student?.name} />
              </Avatar>
            </div>
            
            <div className="compact-content">
              <div className="compact-faculty-info">
                <div className="compact-faculty-name">{consultation.student?.name || 'Student'}</div>
                {consultation.student?.course ? (
                  <div className="compact-faculty-title">{consultation.student.course}</div>
                ) : null}
              </div>
              
              <div className="compact-time-info">
                <CalendarDaysIcon className="time-icon" />
                <span className="time-text">{formatDateTimeLabel(consultation)}</span>
              </div>
              
              <div className="compact-badges">
                <div className={`compact-mode-indicator ${consultation.mode}`}>
                  <span className="mode-dot"></span>
                  <span className="mode-text">
                    {consultation.mode === 'online' ? 'Online' : 'In-Person'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="compact-action">
              <button className={getActionButtonClass(index)} onClick={() => handleActionClick(consultation, index)}>
                <span>{getActionButtonText(index)}</span>
                <ChevronRightIcon className="action-icon" />
              </button>
            </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
