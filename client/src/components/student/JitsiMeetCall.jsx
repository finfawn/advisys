import React, { useRef, useState, useEffect } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { BsX } from 'react-icons/bs';
import './JitsiMeetCall.css';

/**
 * JitsiMeetCall Component
 * 
 * Integrates Jitsi Meet using JaaS (Jitsi as a Service) for secure video consultations.
 * Features:
 * - Custom branded video call UI
 * - Secure room naming based on consultation ID
 * - Full control over meeting settings
 * - Responsive design for all devices
 * 
 * @param {string} roomName - Base room name for the meeting
 * @param {string} displayName - Display name for the user in the meeting
 * @param {function} onClose - Callback when user leaves the meeting
 * @param {object} consultationData - Consultation details including topic, advisor info, etc.
 */
const JitsiMeetCall = ({ roomName, displayName, onClose, consultationData }) => {
  const apiRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinedAt, setJoinedAt] = useState(null);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // JaaS App ID from env
  const APP_ID = import.meta.env.VITE_JAAS_APP_ID;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const [jwtToken, setJwtToken] = useState(null);

  // Generate a unique room name based on consultation ID
  const jitsiRoomName = `advisys-${consultationData?.id || roomName}`;

  useEffect(() => {
    let isMounted = true;
    setJwtToken(null);
    if (!APP_ID) {
      console.error('VITE_JAAS_APP_ID is not set');
      return;
    }
    const fetchToken = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/generate-jwt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName: jitsiRoomName,
            user: {
              name: displayName || 'User',
              email: consultationData?.faculty?.email || undefined,
            },
          }),
        });
        const data = await res.json();
        if (isMounted) {
          setJwtToken(data.token || null);
        }
      } catch (err) {
        console.error('Failed to fetch JaaS JWT', err);
      }
    };
    fetchToken();
    return () => {
      isMounted = false;
    };
  }, [API_BASE_URL, APP_ID, jitsiRoomName, displayName, consultationData?.faculty?.email]);

  const handleApiReady = (api) => {
    apiRef.current = api;
    setIsLoading(false);

    // Event listeners
    api.addEventListener('videoConferenceJoined', () => {
      console.log('User joined the conference');
      setJoinedAt(new Date());
      // Auto-enable live captions/transcription
      try {
        api.executeCommand('toggleSubtitles');
      } catch (_) {}
      // If advisor starts the call, notify server that room is ready
      const isAdvisor = String(displayName || '').toLowerCase().includes('advisor');
      if (isAdvisor) {
        const link = `https://8x8.vc/${APP_ID}/${jitsiRoomName}`;
        try {
          fetch(`${API_BASE_URL}/api/consultations/${consultationData?.id}/room-ready`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingLink: link }),
          }).catch(() => {});
        } catch (_) {}
      }
    });

    api.addEventListener('videoConferenceLeft', () => {
      console.log('User left the conference');
      // Finalize transcript for this meeting
      try {
        fetch(`${API_BASE_URL}/api/transcriptions/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: jitsiRoomName }),
        }).catch(() => {});
      } catch (_) {}
      if (onClose) onClose();
    });
  };

  const scheduledEnd = () => {
    const endIso = consultationData?.end_datetime;
    const startIso = consultationData?.start_datetime;
    const durMin = Number(consultationData?.duration || consultationData?.duration_minutes || 0) || 0;
    if (endIso) return new Date(endIso);
    if (startIso && durMin > 0) {
      const s = new Date(startIso);
      return new Date(s.getTime() + durMin * 60000);
    }
    if (joinedAt && durMin > 0) {
      return new Date(joinedAt.getTime() + durMin * 60000);
    }
    return null;
  };

  const confirmAndHangup = () => {
    setConfirmLeaveOpen(false);
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    if (onClose) onClose();
  };

  const handleHangup = () => {
    const end = scheduledEnd();
    const now = new Date();
    if (end && now < end) {
      setConfirmLeaveOpen(true);
      return;
    }
    confirmAndHangup();
  };

  return (
    <div className="jitsi-meet-container">
      {isLoading && (
        <div className="jitsi-loading">
          <div className="loading-spinner"></div>
          <p>Connecting to meeting...</p>
        </div>
      )}
      
      <div className="jitsi-meet-wrapper">
        {jwtToken && (
        <JitsiMeeting
          // Explicitly use JaaS domain for older react-sdk versions
          domain="8x8.vc"
          // JaaS expects roomName formatted as `${APP_ID}/${room}`
          roomName={`${APP_ID}/${jitsiRoomName}`}
          jwt={jwtToken}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableModeratorIndicator: false,
            startScreenSharing: false,
            enableEmailInStats: false,
            prejoinPageEnabled: false,
            hideConferenceSubject: false,
            subject: consultationData?.topic || 'AdviSys Consultation',
            // Best-effort transcription prefs (actual engine/language is controlled in JAAS)
            transcription: {
              enabled: true,
              preferredLanguage: 'auto',
            },
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            DISABLE_VIDEO_BACKGROUND: false,
            HIDE_INVITE_MORE_HEADER: true,
            MOBILE_APP_PROMO: false,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'profile',
              'chat',
              'recording',
              'livestreaming',
              'etherpad',
              'sharedvideo',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'feedback',
              'stats',
              'shortcuts',
              'tileview',
              'download',
              'help',
              'mute-everyone',
            ],
          }}
          userInfo={{
            displayName: displayName || 'Student',
            email: consultationData?.faculty?.email || '',
          }}
          onApiReady={handleApiReady}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
          }}
        />
        )}
      </div>

      {/* Close Button */}
      <button type="button" aria-label="Close meeting" className="jitsi-close-btn" onClick={handleHangup} title="Leave meeting">
        <BsX size={28} />
      </button>

      {confirmLeaveOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10002}}>
          <div style={{background:'#111827', color:'#fff', padding:'20px', borderRadius:12, width:'90%', maxWidth:420, boxShadow:'0 10px 30px rgba(0,0,0,0.4)'}}>
            <h3 style={{margin:'0 0 8px 0', fontSize:18}}>Leave meeting early?</h3>
            <p style={{margin:'0 0 16px 0', fontSize:14, color:'#d1d5db'}}>
              The scheduled consultation time has not ended yet. Are you sure you want to leave?
            </p>
            <div style={{display:'flex', gap:12, justifyContent:'flex-end'}}>
              <button onClick={()=>setConfirmLeaveOpen(false)} style={{padding:'8px 12px', borderRadius:8, background:'#374151', color:'#fff', border:'1px solid #4b5563'}}>Stay</button>
              <button onClick={confirmAndHangup} style={{padding:'8px 12px', borderRadius:8, background:'#dc2626', color:'#fff', border:'1px solid #ef4444'}}>Leave now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JitsiMeetCall;

