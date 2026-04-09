import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import StreamMeetCall from "../../components/student/StreamMeetCall";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function CallWindow() {
  const query = useQuery();
  const cidRaw = query.get("cid");
  const cid = cidRaw ? Number(cidRaw) : null;
  const [consultationData, setConsultationData] = useState(() => {
    if (!cid) return null;
    try {
      const stored = localStorage.getItem(`advisys_consultation_${cid}`);
      return stored ? JSON.parse(stored) : { id: cid };
    } catch (err) {
      console.error(err);
      return { id: cid };
    }
  });

  useEffect(() => {
    if (!cid) return;

    let active = true;
    const token = typeof window !== "undefined" ? localStorage.getItem("advisys_token") : null;
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("advisys_user") : null;
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    const userId = parsedUser?.id || null;
    const role = String(parsedUser?.role || "").toLowerCase();
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadConsultation = async () => {
      if (!userId || !role) return;
      try {
        const endpoint = role === "advisor"
          ? `${base}/api/consultations/advisors/${userId}/consultations`
          : `${base}/api/consultations/students/${userId}/consultations`;
        const response = await fetch(endpoint, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const list = await response.json();
        const found = Array.isArray(list) ? list.find((item) => Number(item.id) === Number(cid)) : null;
        if (!found || !active) return;

        setConsultationData(found);
        try {
          localStorage.setItem(`advisys_consultation_${cid}`, JSON.stringify(found));
        } catch (_) {}
      } catch (err) {
        console.error("Failed to load consultation for call window", err);
      }
    };

    loadConsultation();
    return () => {
      active = false;
    };
  }, [cid]);

  const handleClose = () => {
    try {
      if (window.opener && consultationData?.id) {
        window.opener.postMessage({ type: 'advisys-call-ended', cid: consultationData.id }, '*');
      }
      window.close();
    } catch (err) { console.error(err); } {}
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {consultationData && (
        <StreamMeetCall
          roomName={`consultation-${consultationData.id}`}
          displayName="Participant"
          onClose={handleClose}
          consultationData={consultationData}
        />
      )}
    </div>
  );
}
