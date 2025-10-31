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
        const res = await fetch(`${API_BASE_URL}/api/jaas/token`, {
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
    });

    api.addEventListener('videoConferenceLeft', () => {
      console.log('User left the conference');
      if (onClose) onClose();
    });
  };

  const handleHangup = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    if (onClose) onClose();
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
          appId={APP_ID}
          roomName={jitsiRoomName}
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
              'hangup',
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
    </div>
  );
};

export default JitsiMeetCall;

