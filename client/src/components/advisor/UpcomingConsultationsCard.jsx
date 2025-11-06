import React, { useEffect, useState, useMemo } from "react";
import { BsClock, BsChevronRight, BsCalendar } from "react-icons/bs";
import "./UpcomingConsultationsCard.css";
import { Card, CardHeader, CardTitle, CardContent } from "../../lightswind/card";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "../../lightswind/skeleton";

export default function UpcomingConsultationsCard() {
  const navigate = useNavigate();
  const [allConsultations, setAllConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = localStorage.getItem('advisys_user');
        const storedToken = localStorage.getItem('advisys_token');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id || 1;
        const res = await fetch(`${base}/api/advisors/${advisorId}/consultations`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        });
        const data = await res.json();
        setAllConsultations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load advisor consultations', err);
      }
      finally {
        setLoading(false);
      }
    };
    fetchConsultations();
  }, []);

  const consultations = useMemo(() => {
    const now = new Date();
    return allConsultations
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
        return { ...c, status, _start: start, _inGrace: inGrace };
      })
      .filter(c => c.status === 'approved' && c._start && (c._start >= now || c._inGrace))
      .sort((a, b) => new Date(a._start || a.date) - new Date(b._start || b.date));
  }, [allConsultations]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

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
            <BsChevronRight className="view-all-icon" />
          </button>
        </div>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="upcoming-consultations-list">
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="compact-consultation-card">
                  <div className="compact-date-section">
                    <Skeleton className="h-12 w-12 rounded-lg" shimmer />
                  </div>
                  <div className="compact-content w-full">
                    <Skeleton className="h-5 w-2/3 mb-2" shimmer />
                    <Skeleton className="h-4 w-1/2 mb-2" shimmer />
                    <Skeleton className="h-4 w-24" shimmer />
                  </div>
                  <div className="compact-action">
                    <Skeleton className="h-9 w-24 rounded-md" shimmer />
                  </div>
                </div>
              ))}
            </>
          )}
          {consultations.length === 0 && (
            <div className="upcoming-empty">
              <BsCalendar className="upcoming-empty-icon" />
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
            <div className="compact-date-section">
              <div className="compact-date">
                <div className="compact-dow">{formatDate(consultation.date).split(' ')[0]}</div>
                <div className="compact-dom">{formatDate(consultation.date).split(' ')[2]}</div>
              </div>
            </div>
            
            <div className="compact-content">
              <div className="compact-faculty-info">
                <div className="compact-faculty-name">{consultation.student.name}</div>
                <div className="compact-faculty-title">{consultation.student.course}</div>
              </div>
              
              <div className="compact-time-info">
                <BsClock className="time-icon" />
                <span className="time-text">{consultation.time}</span>
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
                {getActionButtonText(index)}
                <BsChevronRight className="action-icon" />
              </button>
            </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
