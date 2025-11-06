import React, { useEffect, useState } from 'react';
import './ProfileCompletionBanner.css';
import { useNavigate } from 'react-router-dom';

export default function ProfileCompletionBanner() {
  const [show, setShow] = useState(false);
  const [missing, setMissing] = useState([]);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const userStr = localStorage.getItem('advisys_user');
        const user = userStr ? JSON.parse(userStr) : null;
        const advisorId = user?.id;
        if (!advisorId) {
          setShow(false);
          setChecking(false);
          return;
        }

        // Fetch advisor consultation details only; show banner ONLY when core consultation is incomplete
        // Default to "complete" to avoid showing the banner when everything is set or the check fails.
        let incompleteConsultation = false;
        try {
          const aRes = await fetch(`${base}/api/advisors/${advisorId}`);
          if (aRes.ok) {
            const a = await aRes.json();
            const topics = Array.isArray(a.topicsCanHelpWith) ? a.topicsCanHelpWith : [];
            const guidelines = Array.isArray(a.consultationGuidelines) ? a.consultationGuidelines : [];
            const modes = Array.isArray(a.consultationMode) ? a.consultationMode : [];
            const weekly = a.weeklySchedule || {};
            const hasAvailability = Object.values(weekly).some(v => typeof v === 'string' && v !== 'Unavailable');

            // Determine missing core elements (bio intentionally optional)
            let missingParts = [];
            if (!(topics.length > 0)) missingParts.push('topics');
            if (!(guidelines.length > 0)) missingParts.push('guidelines');
            if (!(modes.length > 0)) missingParts.push('consultation mode');
            if (!hasAvailability) missingParts.push('weekly availability');

            // Fallback: if mode or availability are missing, infer from future slots
            if (missingParts.includes('consultation mode') || missingParts.includes('weekly availability')) {
              try {
                const pad = (n) => String(n).padStart(2, '0');
                const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                const today = new Date();
                const future = new Date();
                future.setDate(today.getDate() + 30);
                const sRes = await fetch(`${base}/api/advisors/${advisorId}/slots?start=${fmtDate(today)}&end=${fmtDate(future)}`);
                if (sRes.ok) {
                  const slots = await sRes.json();
                  const arr = Array.isArray(slots) ? slots : [];
                  const availableSlots = arr.filter(s => String(s.status).toLowerCase() === 'available');
                  const hasAnySlots = availableSlots.length > 0;
                  const hasOnline = availableSlots.some(s => {
                    const m = String(s.mode || '').toLowerCase();
                    return m === 'online' || m === 'hybrid';
                  });
                  const hasInPerson = availableSlots.some(s => {
                    const m = String(s.mode || '').toLowerCase();
                    return m === 'face_to_face' || m === 'in_person' || m === 'hybrid';
                  });

                  if (hasAnySlots && missingParts.includes('weekly availability')) {
                    missingParts = missingParts.filter(p => p !== 'weekly availability');
                  }
                  if ((hasOnline || hasInPerson) && missingParts.includes('consultation mode')) {
                    missingParts = missingParts.filter(p => p !== 'consultation mode');
                  }
                }
              } catch (_) {
                // ignore fallback errors; banner will remain until core settings are saved
              }
            }

            setMissing(missingParts);
            incompleteConsultation = missingParts.length > 0;
          }
        } catch (_) {}

        setShow(incompleteConsultation);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  const handleGoToSettings = () => {
    navigate('/advisor-dashboard/profile?onboarding=1');
  };

  const handleGoToAvailability = () => {
    navigate('/advisor-dashboard/availability');
  };

  // Hide the banner while checking or when there are no missing parts.
  if (checking || !show || missing.length === 0) return null;

  return (
    <div className="profile-completion-banner">
      <div className="banner-content">
        <span className="banner-title">Improve your consultation setup</span>
        <span className="banner-text">
          {`Add ${missing.join(', ')} to make your profile more helpful to students.`}
        </span>
      </div>
      <div className="banner-actions">
        <button onClick={handleGoToSettings} className="banner-btn primary">Go to Settings</button>
        <button onClick={handleGoToAvailability} className="banner-btn secondary">Set Availability</button>
      </div>
    </div>
  );
}