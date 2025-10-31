import React, { useRef, useState } from 'react';
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

  // JaaS App ID
  const APP_ID = 'vpaas-magic-cookie-b118173ff30b45ad83bfd4d7e2c005b9';

  // Generate a unique room name based on consultation ID
  const jitsiRoomName = `advisys-${consultationData?.id || roomName}`;

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
        <JitsiMeeting
          appId={APP_ID}
          roomName={jitsiRoomName}
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
      </div>

      {/* Close Button */}
      <button type="button" aria-label="Close meeting" className="jitsi-close-btn" onClick={handleHangup} title="Leave meeting">
        <BsX size={28} />
      </button>
    </div>
  );
};

export default JitsiMeetCall;

