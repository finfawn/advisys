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
  const mediaRecorderRef = useRef(null);
  const captureStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const destinationNodeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinedAt, setJoinedAt] = useState(null);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [inMeeting, setInMeeting] = useState(true);
  const [earlyEndPromptOpen, setEarlyEndPromptOpen] = useState(false);
  const [studentLeavePromptOpen, setStudentLeavePromptOpen] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const [rejoinSeed, setRejoinSeed] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle|recording|uploading|transcribing|done|error
  const [recordingError, setRecordingError] = useState('');
  const recordingChunksRef = useRef([]);

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
        // Derive role from authenticated user rather than display name
        const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const parsedUser = userRaw ? JSON.parse(userRaw) : null;
        const roleVal = String(parsedUser?.role || '').toLowerCase() === 'advisor' ? 'advisor' : 'student';
        const nameForJwt = parsedUser?.full_name || displayName || 'User';
        const emailForJwt = parsedUser?.email || consultationData?.faculty?.email || undefined;
        const res = await fetch(`${API_BASE_URL}/generate-jwt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName: jitsiRoomName,
            user: {
              name: nameForJwt,
              email: emailForJwt,
              role: roleVal,
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

  async function startCombinedAudioCapture() {
    try {
      setRecordingError('');
      // Request tab capture (browser may require video track to allow audio capture)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      // Build an audio-only stream for recording
      const audioTracks = displayStream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        throw new Error('No audio track available from tab capture.');
      }
      captureStreamRef.current = displayStream; // keep original to stop on end

      // Request microphone stream to include local participant
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      micStreamRef.current = micStream;

      // Choose a supported mime type
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ];
      let chosenType = '';
      for (const t of preferredTypes) {
        if (MediaRecorder.isTypeSupported(t)) { chosenType = t; break; }
      }
      // Mix tab audio + mic audio via WebAudio
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      const destination = ctx.createMediaStreamDestination();
      destinationNodeRef.current = destination;
      const tabSource = ctx.createMediaStreamSource(new MediaStream(audioTracks));
      const micSource = ctx.createMediaStreamSource(micStream);
      // Optionally adjust gains to balance levels
      const tabGain = ctx.createGain(); tabGain.gain.value = 1.0;
      const micGain = ctx.createGain(); micGain.gain.value = 1.0;
      tabSource.connect(tabGain).connect(destination);
      micSource.connect(micGain).connect(destination);

      const mixedStream = destination.stream;
      const mr = new MediaRecorder(mixedStream, chosenType ? { mimeType: chosenType } : undefined);
      mediaRecorderRef.current = mr;
      recordingChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        try {
          const blob = new Blob(recordingChunksRef.current, { type: chosenType || 'audio/webm' });
          recordingChunksRef.current = [];
          setRecordingStatus('uploading');
          await uploadAudioBlob(blob);
        } catch (err) {
          console.error('Recorder stop/upload error', err);
          setRecordingError(err?.message || String(err));
          setRecordingStatus('error');
        }
      };
      mr.start();
      setRecordingStatus('recording');
    } catch (err) {
      console.error('Failed to start tab audio capture:', err);
      setRecordingError(err?.message || String(err));
      setRecordingStatus('error');
    }
  }

  async function stopCombinedAudioCapture() {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      // Stop all tracks from the original display stream
      const ds = captureStreamRef.current;
      if (ds) {
        ds.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
        captureStreamRef.current = null;
      }
      // Stop mic tracks
      const ms = micStreamRef.current;
      if (ms) {
        ms.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
        micStreamRef.current = null;
      }
      // Close audio context
      const ctx = audioContextRef.current;
      if (ctx && typeof ctx.close === 'function') {
        try { await ctx.close(); } catch (_) {}
        audioContextRef.current = null;
        destinationNodeRef.current = null;
      }
    } catch (err) {
      console.warn('Error stopping tab capture:', err);
    }
  }

  async function uploadAudioBlob(blob) {
    try {
      if (!consultationData?.id) throw new Error('Missing consultation ID');
      setRecordingStatus('uploading');
      const fd = new FormData();
      fd.append('file', blob, `consultation-${consultationData.id}.webm`);
      fd.append('consultationId', String(consultationData.id));
      // Optional custom languageCode override if needed later
      // fd.append('languageCode', 'en-US');
      const res = await fetch(`${API_BASE_URL}/api/transcriptions/upload`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Upload/transcription failed');
      }
      setRecordingStatus(data?.summarized ? 'done' : 'done');
    } catch (err) {
      console.error('Upload error:', err);
      setRecordingError(err?.message || String(err));
      setRecordingStatus('error');
    }
  }

  const handleApiReady = (api) => {
    apiRef.current = api;
    setIsLoading(false);

    // Event listeners
    api.addEventListener('videoConferenceJoined', () => {
      console.log('User joined the conference');
      setJoinedAt(new Date());
      // Do not auto-start subtitles; rely on tenant-side transcription availability
      // If advisor starts the call, notify server that room is ready
      const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const parsedUser = userRaw ? JSON.parse(userRaw) : null;
      const isAdvisor = String(parsedUser?.role || '').toLowerCase() === 'advisor';
      setInMeeting(true);
      // Begin tab audio capture for transcripts-only flow
      startCombinedAudioCapture();
      // Record actual start time when meeting is joined
      if (consultationData?.id) {
        try {
          fetch(`${API_BASE_URL}/api/consultations/${consultationData.id}/started`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch(()=>{});
        } catch (_) {}
      }
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
      // Stop capture to trigger dataavailable + upload
      stopCombinedAudioCapture();
      // Finalize transcript for this meeting
      try {
        fetch(`${API_BASE_URL}/api/transcriptions/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: jitsiRoomName }),
        }).catch(() => {});
      } catch (_) {}
      // Determine role and scheduled window to decide next action
      const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const parsedUser = userRaw ? JSON.parse(userRaw) : null;
      const isAdvisor = String(parsedUser?.role || '').toLowerCase() === 'advisor';
      const end = scheduledEnd();
      const now = new Date();
      setInMeeting(false);
      if (end && now < end) {
        if (isAdvisor) {
          // Advisor ended early: show confirmation to finalize consultation or resume
          setEarlyEndPromptOpen(true);
        } else {
          // Student ended early: allow rejoin until end time
          setStudentLeavePromptOpen(true);
        }
      } else {
        // Past scheduled end: advisor leaving should mark consultation completed
        if (isAdvisor && consultationData?.id) {
          try {
            fetch(`${API_BASE_URL}/api/consultations/${consultationData.id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed' }),
            }).catch(() => {});
          } catch (_) {}
        }
        if (onClose) onClose();
      }
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

  // Countdown to scheduled end and auto-hangup
  useEffect(() => {
    const end = scheduledEnd();
    if (!end) { setCountdownText(''); return; }
    function fmt(ms) {
      const totalSec = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const hh = h > 0 ? String(h).padStart(2, '0') + ':' : '';
      return `${hh}${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    const id = setInterval(() => {
      const now = new Date();
      const remaining = end.getTime() - now.getTime();
      if (remaining <= 0) {
        setCountdownText('Ending...');
        clearInterval(id);
        if (inMeeting && apiRef.current) {
          apiRef.current.executeCommand('hangup');
        }
      } else {
        setCountdownText(`Call ends in ${fmt(remaining)}`);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedAt, consultationData?.end_datetime, consultationData?.start_datetime, consultationData?.duration, consultationData?.duration_minutes, inMeeting]);

  return (
    <div className="jitsi-meet-container">
      {isLoading && (
        <div className="jitsi-loading">
          <div className="loading-spinner"></div>
          <p>Connecting to meeting...</p>
        </div>
      )}
      
      <div className="jitsi-meet-wrapper">
        {jwtToken && inMeeting && (
        <JitsiMeeting
          key={rejoinSeed}
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
              enabled: false,
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
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'profile',
              'chat',
              'hangup',
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
      {/* Countdown overlay */}
      {inMeeting && countdownText && (
        <div style={{position:'fixed', top:12, left:12, background:'rgba(17,24,39,0.9)', color:'#fff', padding:'8px 12px', borderRadius:8, zIndex:10002, fontSize:13, border:'1px solid #374151'}}>
          {countdownText}
        </div>
      )}

      {/* Recording/Transcription status overlay */}
      {inMeeting && recordingStatus !== 'idle' && (
        <div style={{position:'fixed', top:12, right:12, background:'rgba(8,145,178,0.9)', color:'#fff', padding:'8px 12px', borderRadius:8, zIndex:10002, fontSize:13, border:'1px solid #0891b2'}}>
          {recordingStatus === 'recording' && 'Recording tab audio for transcription…'}
          {recordingStatus === 'uploading' && 'Uploading audio securely…'}
          {recordingStatus === 'transcribing' && 'Transcribing…'}
          {recordingStatus === 'done' && 'Transcript ready'}
          {recordingStatus === 'error' && `Recording error: ${recordingError}`}
        </div>
      )}

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

      {/* Advisor early-end confirmation (post-leave) */}
      {earlyEndPromptOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10002}}>
          <div style={{background:'#111827', color:'#fff', padding:'20px', borderRadius:12, width:'90%', maxWidth:480, boxShadow:'0 10px 30px rgba(0,0,0,0.4)'}}>
            <h3 style={{margin:'0 0 8px 0', fontSize:18}}>End consultation now?</h3>
            <p style={{margin:'0 0 16px 0', fontSize:14, color:'#d1d5db'}}>
              The scheduled consultation time has not ended yet. Ending now will mark this consultation as completed.
            </p>
            <div style={{display:'flex', gap:12, justifyContent:'flex-end'}}>
              <button onClick={()=>{ setEarlyEndPromptOpen(false); setInMeeting(true); setRejoinSeed(s=>s+1); }} style={{padding:'8px 12px', borderRadius:8, background:'#374151', color:'#fff', border:'1px solid #4b5563'}}>Resume call</button>
              <button onClick={()=>{
                setEarlyEndPromptOpen(false);
                if (consultationData?.id) {
                  try {
                    fetch(`${API_BASE_URL}/api/consultations/${consultationData.id}/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'completed' }),
                    }).catch(()=>{});
                  } catch (_) {}
                }
                if (onClose) onClose();
              }} style={{padding:'8px 12px', borderRadius:8, background:'#10b981', color:'#fff', border:'1px solid #34d399'}}>End now</button>
            </div>
          </div>
        </div>
      )}

      {/* Student early leave prompt (post-leave) */}
      {studentLeavePromptOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10002}}>
          <div style={{background:'#111827', color:'#fff', padding:'20px', borderRadius:12, width:'90%', maxWidth:440, boxShadow:'0 10px 30px rgba(0,0,0,0.4)'}}>
            <h3 style={{margin:'0 0 8px 0', fontSize:18}}>You left the meeting</h3>
            <p style={{margin:'0 0 16px 0', fontSize:14, color:'#d1d5db'}}>
              You can rejoin until the scheduled end time.
            </p>
            <div style={{display:'flex', gap:12, justifyContent:'flex-end'}}>
              <button onClick={()=>{ setStudentLeavePromptOpen(false); setInMeeting(true); setRejoinSeed(s=>s+1); }} style={{padding:'8px 12px', borderRadius:8, background:'#374151', color:'#fff', border:'1px solid #4b5563'}}>Resume call</button>
              <button onClick={()=>{ setStudentLeavePromptOpen(false); if (onClose) onClose(); }} style={{padding:'8px 12px', borderRadius:8, background:'#6b7280', color:'#fff', border:'1px solid #9ca3af'}}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JitsiMeetCall;

