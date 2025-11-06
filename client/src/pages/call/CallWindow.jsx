import React, { useMemo } from "react";
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

  let consultationData = null;
  if (cid) {
    try {
      const stored = localStorage.getItem(`advisys_consultation_${cid}`);
      consultationData = stored ? JSON.parse(stored) : { id: cid };
    } catch (_) {
      consultationData = { id: cid };
    }
  }

  const handleClose = () => {
    try { window.close(); } catch (_) {}
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