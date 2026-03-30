import React, { useEffect, useRef, useState } from 'react';
import { StreamVideoClient, StreamVideo, StreamCall, StreamTheme, SpeakerLayout, PaginatedGridLayout, CallParticipantsList, useCallStateHooks, ToggleAudioPublishingButton, ToggleVideoPublishingButton, ScreenShareButton } from '@stream-io/video-react-sdk';
import { StreamChat } from 'stream-chat';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { BsTelephoneX, BsChatDots, BsClock, BsGrid1X2, BsPeople, BsBroadcastPin, BsInfoCircle } from 'react-icons/bs';
import { toast } from '../hooks/use-toast';

import './StreamMeetCall.css';

const getInitials = (value) => {
  const text = String(value || '').trim();
  if (!text) return 'U';
  const parts = text.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

const MeetingHeader = ({
  consultationData,
  countdownText,
  recordingStatus,
  activePanel,
  layoutName,
  onTogglePanel,
  onToggleLayout,
  onToggleStats,
}) => {
  const { useParticipants, useCallStatsReport } = useCallStateHooks();
  const participants = useParticipants ? useParticipants() : [];
  const stats = useCallStatsReport ? useCallStatsReport() : null;
  const latency = stats?.publisherStats?.averageRoundTripTimeInMs;

  return (
    <header className="smc-meeting-header">
      <div className="smc-brand-block">
        <div className="smc-brand-mark">AS</div>
        <div className="smc-brand-copy">
          <span className="smc-brand-eyebrow">AdviSys live consultation</span>
          <strong className="smc-brand-title">
            {consultationData?.topic || 'Consultation Meeting'}
          </strong>
        </div>
      </div>

      <div className="smc-header-actions">
        <button
          type="button"
          className={`smc-header-chip ${activePanel === 'people' ? 'is-active' : ''}`}
          onClick={() => onTogglePanel('people')}
        >
          <BsPeople />
          <span>{participants?.length || 0}</span>
        </button>
        {countdownText ? (
          <div className="smc-header-chip smc-header-chip--timer">
            <BsClock />
            <span>{countdownText}</span>
          </div>
        ) : null}
        {typeof latency === 'number' && Number.isFinite(latency) ? (
          <button
            type="button"
            className="smc-header-chip smc-header-chip--latency"
            onClick={onToggleStats}
          >
            <BsBroadcastPin />
            <span>{Math.round(latency)} ms</span>
          </button>
        ) : null}
        {recordingStatus === 'recording' ? (
          <div className="smc-header-chip smc-header-chip--recording">
            <span className="smc-recording-pip" />
            <span>Recording</span>
          </div>
        ) : null}
        <button
          type="button"
          className={`smc-header-chip ${layoutName === 'PaginatedGrid' ? 'is-active' : ''}`}
          onClick={onToggleLayout}
        >
          <BsGrid1X2 />
          <span>{layoutName === 'PaginatedGrid' ? 'Grid' : 'Focus'}</span>
        </button>
      </div>
    </header>
  );
};

/**
 * StreamMeetCall Component
 *
 * Replaces JitsiMeetCall with Stream Video React SDK.
 * Maintains the same props and local audio capture/transcription pipeline.
 *
 * @param {string} roomName - Base room name for the meeting
 * @param {string} displayName - Display name for the user in the meeting
 * @param {function} onClose - Callback when user leaves the meeting
 * @param {object} consultationData - Consultation details including topic, advisor info, etc.
 */
const StreamMeetCall = ({ roomName, displayName, onClose, consultationData }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const callType = 'default';
  const CAPTURE_TAB_AUDIO = String(import.meta.env.VITE_CAPTURE_TAB_AUDIO || 'false').toLowerCase() === 'true';

  const mediaRecorderRef = useRef(null);
  const captureStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const destinationNodeRef = useRef(null);
  const recordingChunksRef = useRef([]);

  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinedAt, setJoinedAt] = useState(null);
  const [inMeeting, setInMeeting] = useState(true);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [advisorDecisionOpen, setAdvisorDecisionOpen] = useState(false);
  const [studentLeavePromptOpen, setStudentLeavePromptOpen] = useState(false);
  const [endOptionsOpen, setEndOptionsOpen] = useState(false);
  const endActionGuardRef = useRef(false);
  const [countdownText, setCountdownText] = useState('');
  const [rejoinSeed, setRejoinSeed] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle|recording|uploading|transcribing|done|error
  const [recordingError, setRecordingError] = useState('');
  const [chatClient, setChatClient] = useState(null);
  const [chatChannel, setChatChannel] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [selfId, setSelfId] = useState('');
  const [selfName, setSelfName] = useState('');
  const chatListRef = useRef(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const endedForAllRef = useRef(false);
  const advisorOutcomeHandledRef = useRef(false);
  const [advisorOutcome, setAdvisorOutcome] = useState('completed');
  const [advisorOutcomeReason, setAdvisorOutcomeReason] = useState('student_left_early');
  const [advisorOutcomeNotes, setAdvisorOutcomeNotes] = useState('');
  const [submittingAdvisorOutcome, setSubmittingAdvisorOutcome] = useState(false);
  const [advisorOutcomeError, setAdvisorOutcomeError] = useState('');
  const [earlyFinalizeWarningOpen, setEarlyFinalizeWarningOpen] = useState(false);
  const [minuteWarnOpen, setMinuteWarnOpen] = useState(false);
  const minuteWarnShownRef = useRef(false);

  // Generate a stable call ID based on consultation ID
  const callId = `advisys-${consultationData?.id || roomName}`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const parsedUser = userRaw ? JSON.parse(userRaw) : null;
        const userId = String(parsedUser?.id || 'user');
        const fullName = parsedUser?.full_name || displayName || 'User';
        setSelfId(userId); setSelfName(fullName);
        // Ask backend for Stream token + apiKey
        const res = await fetch(`${API_BASE_URL}/api/stream/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, name: fullName, callId, type: callType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to obtain Stream token');
        if (!mounted) return;

        const c = new StreamVideoClient({
          apiKey: data.apiKey,
          user: { id: userId, name: fullName },
          token: data.token,
        });
        setClient(c);
        const callObj = c.call(callType, callId);
        setCall(callObj);
        // Join and create if missing
        await callObj.join({ create: true });

        // Mark joined state
        setJoinedAt(new Date());
        setInMeeting(true);
        setIsLoading(false);

        // Start local audio capture for transcription pipeline
        await startCombinedAudioCapture();

        // Notify backend of started event
        if (consultationData?.id) {
          try {
            fetch(`${API_BASE_URL}/api/consultations/${consultationData.id}/started`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            }).catch(()=>{});
          } catch (_) {}
        }

        // If advisor: mark room ready with Stream call link
        const roleVal = String(parsedUser?.role || '').toLowerCase();
        const isAdvisorLocal = roleVal === 'advisor';
        setIsAdvisor(isAdvisorLocal);
        if (isAdvisorLocal) {
          const link = `stream:${callType}/${callId}`;
          try {
            fetch(`${API_BASE_URL}/api/consultations/${consultationData?.id}/room-ready`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meetingLink: link }),
            }).catch(()=>{});
          } catch (_) {}
        }

        // Attempt to hook leave events to stop capture
        try {
          callObj.on('call.session_ended', () => {
            if (advisorOutcomeHandledRef.current) return;
            endedForAllRef.current = true;
            handleLeave();
          });
        } catch (_) {}

        // Initialize Stream Chat client for in-call chat
        try {
          const sc = StreamChat.getInstance(data.apiKey);
          await sc.connectUser({ id: userId, name: fullName }, data.token);
          const channelId = `advisys-${consultationData?.id || callId}`;
          const members = [userId].filter(Boolean);
          // Attempt to include advisor/student IDs if present in consultationData
          const sid = consultationData?.student_user_id || consultationData?.studentId || consultationData?.student?.id;
          const aid = consultationData?.advisor_user_id || consultationData?.advisorId || consultationData?.advisor?.id;
          if (sid && !members.includes(String(sid))) members.push(String(sid));
          if (aid && !members.includes(String(aid))) members.push(String(aid));
          const ch = sc.channel('livestream', channelId, { name: `Consultation ${consultationData?.id || ''}`, members });
          await ch.watch();
          const initial = (ch.state?.messages || []).map(m => m);
          setChatMessages(initial);
          ch.on('message.new', (ev) => {
            const m = ev.message;
            setChatMessages(prev => [...prev, m]);
          });
          ch.on('reaction.new', (ev) => {
            const r = ev.reaction;
            const mid = r?.message_id;
            if (!mid) return;
            setChatMessages(prev => prev.map(m => {
              if (m.id !== mid) return m;
              const counts = { ...(m.reaction_counts || {}) };
              const type = r.type || 'love';
              counts[type] = (counts[type] || 0) + (r.score || 1);
              return { ...m, reaction_counts: counts };
            }));
          });
          setChatClient(sc);
          setChatChannel(ch);
        } catch (e) {
          console.warn('Chat init failed:', e?.message || e);
        }
      } catch (err) {
        console.error('Stream init error:', err);
        setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
      // Stop capture on unmount for safety
      stopCombinedAudioCapture();
      finalizeTranscript();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL, callId, callType, displayName, consultationData?.id]);

  const { useParticipants } = useCallStateHooks ? useCallStateHooks() : { useParticipants: null };
  const participants = useParticipants ? useParticipants() : [];

  useEffect(() => {
    const status = String(consultationData?.status || '').toLowerCase();
    const end = scheduledEnd();
    if (!inMeeting || !end || status === 'completed' || status === 'cancelled' || status === 'canceled' || status === 'missed' || status === 'incomplete') { setCountdownText(''); return; }
    const tick = () => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        if (!endActionGuardRef.current) {
          endActionGuardRef.current = true;
          (async () => {
            try { if (isAdvisor) { await call?.endCall?.(); } } catch (_) {}
            try { await call?.leave?.(); } catch (_) {}
            endedForAllRef.current = true;
            handleLeave();
            setTimeout(()=>{ endActionGuardRef.current = false; }, 1200);
          })();
        }
        setCountdownText('Ended');
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdownText(`${mins}:${String(secs).padStart(2, '0')}`);
        if (diff <= 60000 && diff > 0 && !minuteWarnShownRef.current) {
          minuteWarnShownRef.current = true;
          setMinuteWarnOpen(true);
          setTimeout(()=> setMinuteWarnOpen(false), 15000);
        }
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [inMeeting, joinedAt, consultationData?.end_datetime, consultationData?.duration, consultationData?.duration_minutes, isAdvisor, call, participants?.length, consultationData?.status]);

  useEffect(() => {
    if (!inMeeting || rejoinSeed === 0) return;
    (async () => {
      try { await call?.join?.({ create: false }); } catch (_) {}
      try { await startCombinedAudioCapture(); } catch (_) {}
    })();
  }, [rejoinSeed, inMeeting, call]);

  // countdown is handled in the main timer effect above

  // Auto-scroll chat to newest message when opened or updated
  useEffect(() => {
    try {
      if (chatListRef.current && activePanel === 'chat') {
        chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
      }
    } catch (_) {}
  }, [chatMessages, activePanel]);

  // Listen for parent tab messages to trigger a graceful leave
  useEffect(() => {
    const handler = (e) => {
      try {
        const msg = e?.data;
        if (msg && msg.type === 'advisys-leave' && String(msg.cid) === String(consultationData?.id)) {
          handleHangup();
        }
      } catch (_) {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationData?.id]);

  

  async function startCombinedAudioCapture() {
    try {
      setRecordingError('');
      // Decide capture path based on configuration
      let mr;
      let chosenType = '';
      const preferredTypes = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
      for (const t of preferredTypes) { if (MediaRecorder.isTypeSupported(t)) { chosenType = t; break; } }

      if (CAPTURE_TAB_AUDIO) {
        // Try to capture tab/system audio. Some browsers require video: true.
        let displayStream = null;
        let audioTracks = [];
        try {
          const ds = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          const dsAudio = ds.getAudioTracks();
          if (dsAudio && dsAudio.length > 0) {
            displayStream = ds;
            audioTracks = dsAudio;
          }
        } catch (e) {
          console.warn('Tab audio capture unavailable, falling back to mic-only recording:', e);
        }
        captureStreamRef.current = displayStream;

        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        micStreamRef.current = micStream;

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = ctx;
        const destination = ctx.createMediaStreamDestination();
        destinationNodeRef.current = destination;
        // Mix available sources (tab/system audio if present, plus microphone)
        if (audioTracks.length > 0) {
          const tabSource = ctx.createMediaStreamSource(new MediaStream(audioTracks));
          const tabGain = ctx.createGain(); tabGain.gain.value = 1.0;
          tabSource.connect(tabGain).connect(destination);
        }
        if (micStream) {
          const micSource = ctx.createMediaStreamSource(micStream);
          const micGain = ctx.createGain(); micGain.gain.value = 1.0;
          micSource.connect(micGain).connect(destination);
        }
        if (audioTracks.length === 0 && !micStream) {
          throw new Error('No audio source available for recording');
        }
        const mixedStream = destination.stream;
        mr = new MediaRecorder(mixedStream, chosenType ? { mimeType: chosenType } : undefined);
      } else {
        // Mic-only: avoid AudioContext so recording persists even if tab backgrounded
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        micStreamRef.current = micStream;
        mr = new MediaRecorder(micStream, chosenType ? { mimeType: chosenType } : undefined);
      }

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
      const ds = captureStreamRef.current;
      if (ds) {
        ds.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
        captureStreamRef.current = null;
      }
      const ms = micStreamRef.current;
      if (ms) {
        ms.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
        micStreamRef.current = null;
      }
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
      // Do not use keepalive for large audio uploads; browsers may drop bodies >64KB
      const res = await fetch(`${API_BASE_URL}/api/transcriptions/upload`, { method: 'POST', body: fd });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Upload/transcription failed');
      }
      setRecordingStatus('done');
    } catch (err) {
      console.error('Upload error:', err);
      setRecordingError(err?.message || String(err));
      setRecordingStatus('error');
    }
  }

  function scheduledEnd() {
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
  }

  function finalizeTranscript() {
    try {
      fetch(`${API_BASE_URL}/api/transcriptions/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: callId }),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}
  }

  function handleLeave() {
    // Stop capture to trigger upload
    stopCombinedAudioCapture();
    finalizeTranscript();
    // Notify parent window (details page) to refresh this consultation
    try {
      if (typeof window !== 'undefined' && window.opener) {
        window.opener.postMessage({ type: 'advisys-call-ended', cid: consultationData?.id }, '*');
      }
    } catch (_) {}
    const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const parsedUser = userRaw ? JSON.parse(userRaw) : null;
    const isAdvisor = String(parsedUser?.role || '').toLowerCase() === 'advisor';
    setInMeeting(false);
    const end = scheduledEnd();
    const now = new Date();
    if (!isAdvisor) {
      if (end && now < end) {
        setStudentLeavePromptOpen(true);
      } else if (onClose) {
        onClose();
      }
      return;
    }
    // Advisor flow: require an outcome only when the session was ended for all
    if (endedForAllRef.current && !advisorOutcomeHandledRef.current) {
      setAdvisorDecisionOpen(true);
    } else {
      if (onClose) onClose();
    }
  }

  // Using native CallControls; leave confirmation/decision handled by session_ended hook

  const confirmAndHangup = async () => {
    setConfirmLeaveOpen(false);
    try {
      await call?.leave();
    } catch (_) {}
    handleLeave();
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

  const getRemainingSessionMs = () => {
    const end = scheduledEnd();
    if (!end) return 0;
    return Math.max(0, end.getTime() - Date.now());
  };

  const formatRemainingSession = (ms) => {
    const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (!minutes) return `${hours} hour${hours === 1 ? '' : 's'}`;
      return `${hours}h ${minutes}m`;
    }
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  };

  const performAdvisorOutcomeSubmit = async () => {
    if (!consultationData?.id || submittingAdvisorOutcome) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    setSubmittingAdvisorOutcome(true);
    setAdvisorOutcomeError('');
    try {
      const payload = advisorOutcome === 'completed'
        ? { status: 'completed' }
        : {
            status: 'incomplete',
            incompleteReason: advisorOutcomeReason,
            incompleteNotes: advisorOutcomeNotes || null,
          };

      const response = await fetch(`${API_BASE_URL}/api/consultations/${consultationData.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to save consultation outcome (${response.status})`);
      }

      advisorOutcomeHandledRef.current = true;
      endedForAllRef.current = true;
      setAdvisorDecisionOpen(false);
      setEarlyFinalizeWarningOpen(false);
      setAdvisorOutcomeError('');

      try { await call?.endCall?.(); } catch (_) {}
      try { await call?.leave?.(); } catch (_) {}
      handleLeave();
    } catch (err) {
      console.error('Failed to submit advisor outcome', err);
      const message = err?.message || 'Failed to save consultation outcome';
      setAdvisorOutcomeError(message);
      toast.destructive({ title: 'Unable to finalize consultation', description: message });
    } finally {
      setSubmittingAdvisorOutcome(false);
    }
  };

  const submitAdvisorOutcome = async () => {
    const remainingMs = getRemainingSessionMs();
    if (remainingMs > 0) {
      setEarlyFinalizeWarningOpen(true);
      return;
    }
    await performAdvisorOutcomeSubmit();
  };

  // Recording toggles are not exposed in minimal layout; capture starts automatically on join

  const [layoutName, setLayoutName] = useState('Speaker');
  const isGridLayout = layoutName === 'PaginatedGrid';

  const StatsOverlay = ({ onClose }) => {
    const { useParticipants, useHasOngoingScreenShare, useMicrophoneState, useCameraState } = useCallStateHooks();
    const participants = useParticipants ? useParticipants() : [];
    const hasScreenShare = useHasOngoingScreenShare ? useHasOngoingScreenShare() : false;
    const { isMute: micMuted } = useMicrophoneState ? useMicrophoneState() : { isMute: false };
    const { isMute: camMuted } = useCameraState ? useCameraState() : { isMute: false };
    const duration = joinedAt ? Math.max(0, Math.round((Date.now() - joinedAt.getTime())/1000)) + 's' : '—';
    return (
      <div className="smc-stats-panel" role="dialog" aria-label="Call stats">
        <div className="row"><span className="k">Participants</span><span className="v">{participants?.length || 0}</span></div>
        <div className="row"><span className="k">Screenshare</span><span className="v">{hasScreenShare ? 'On' : 'Off'}</span></div>
        <div className="row"><span className="k">Mic</span><span className="v">{micMuted ? 'Muted' : 'On'}</span></div>
        <div className="row"><span className="k">Camera</span><span className="v">{camMuted ? 'Off' : 'On'}</span></div>
        <div className="row"><span className="k">Duration</span><span className="v">{duration}</span></div>
        <button className="smc-stats-close" onClick={onClose}>Close</button>
      </div>
    );
  };

  return (
    <div className="smc-root">
      {isLoading ? (
        <div className="smc-loading-screen">
          <div className="smc-loading-card">
            <div className="smc-loading-spinner" />
            <h2>Preparing your meeting</h2>
            <p>Connecting to the consultation room and setting up your audio and video.</p>
          </div>
        </div>
      ) : null}

      <div className="smc-stage-canvas">
        {client && call && inMeeting ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <StreamTheme className={`smc-theme ${activePanel ? 'smc-theme--panel-open' : ''}`}>
                <section className="smc-workspace">
                  <MeetingHeader
                  consultationData={consultationData}
                  countdownText={countdownText}
                  recordingStatus={recordingStatus}
                  activePanel={activePanel}
                  layoutName={layoutName}
                  onTogglePanel={(panelName) => setActivePanel((current) => current === panelName ? null : panelName)}
                  onToggleLayout={() => setLayoutName((current) => current === 'PaginatedGrid' ? 'Speaker' : 'PaginatedGrid')}
                  onToggleStats={() => setStatsOpen((current) => !current)}
                  />

                  <div className={`smc-room-shell ${activePanel ? 'smc-room-shell--panel-open' : ''}`}>
                  <div className="smc-stage-shell">
                    <div className="smc-layout-frame">
                      {isGridLayout ? (
                        <PaginatedGridLayout />
                      ) : (
                        <SpeakerLayout participantsBarPosition="bottom" />
                      )}
                    </div>
                  </div>

                  {activePanel ? (
                    <aside className="smc-side-panel" role="complementary">
                      {activePanel === 'people' ? (
                        <CallParticipantsList onClose={() => setActivePanel(null)} />
                      ) : (
                        <>
                          <div className="smc-chat-header">
                            <div className="smc-panel-title">
                              <BsChatDots />
                              <span>Chat</span>
                            </div>
                            <button className="smc-panel-close" onClick={() => setActivePanel(null)}>Close</button>
                          </div>
                          <div className="smc-chat-list" ref={chatListRef}>
                            {(chatMessages || []).map((m) => {
                              const me = String(m?.user?.id || '') === String(selfId);
                              const authorName = m?.user?.name || m?.user?.id || 'User';
                              return (
                                <div key={m.id || Math.random()} className={`smc-chat-item ${me ? 'me' : 'other'}`}>
                                  <div className="smc-message-head">
                                    <div className="smc-message-avatar">
                                      {getInitials(authorName)}
                                    </div>
                                    <div className="smc-message-meta">
                                      <div className="meta">{authorName} • {new Date(m?.created_at || Date.now()).toLocaleTimeString()}</div>
                                      <div className="text">{m?.text || ''}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="smc-chat-input">
                            <input value={chatInput} onChange={(e)=> setChatInput(e.target.value)} placeholder="Type a message" />
                            <button disabled={sendingChat} onClick={async ()=>{
                              try {
                                if (!chatChannel || !chatInput.trim()) return;
                                setSendingChat(true);
                                await chatChannel.sendMessage({ text: chatInput.trim() });
                                setChatInput('');
                              } finally {
                                setSendingChat(false);
                              }
                            }}>Send</button>
                          </div>
                        </>
                      )}
                    </aside>
                  ) : null}
                  </div>
                </section>

                <div className="smc-controls">
                  <ToggleAudioPublishingButton />
                  <ToggleVideoPublishingButton />
                  <ScreenShareButton />
                  <button
                    className={`smc-utility-btn ${layoutName === 'PaginatedGrid' ? 'is-active' : ''}`}
                    onClick={() => setLayoutName((current) => current === 'PaginatedGrid' ? 'Speaker' : 'PaginatedGrid')}
                    title={layoutName === 'PaginatedGrid' ? 'Switch to focus layout' : 'Switch to grid layout'}
                    type="button"
                  >
                    <BsGrid1X2 />
                  </button>
                  <button
                    className={`smc-utility-btn ${activePanel === 'people' ? 'is-active' : ''}`}
                    onClick={() => setActivePanel((current) => current === 'people' ? null : 'people')}
                    title="Participants"
                    type="button"
                  >
                    <BsPeople />
                  </button>
                  <button
                    className={`smc-utility-btn ${activePanel === 'chat' ? 'is-active' : ''}`}
                    onClick={() => setActivePanel((current) => current === 'chat' ? null : 'chat')}
                    title="Chat"
                    type="button"
                  >
                    <BsChatDots />
                  </button>
                  <button
                    className={`smc-utility-btn ${statsOpen ? 'is-active' : ''}`}
                    onClick={() => setStatsOpen((current) => !current)}
                    title="Connection details"
                    type="button"
                  >
                    <BsInfoCircle />
                  </button>
                  <button className="smc-end-btn" onClick={()=> setEndOptionsOpen(true)} title="End call" type="button">
                    <BsTelephoneX />
                  </button>
                </div>

                {statsOpen ? <StatsOverlay onClose={() => setStatsOpen(false)} /> : null}
              </StreamTheme>
            </StreamCall>
          </StreamVideo>
        ) : null}
      </div>

      {inMeeting && minuteWarnOpen && (
        <div className="smc-minute-warn" role="alert">Only 1 minute left in this session.</div>
      )}

      {/* Early leave confirm modal (used for programmatic hangup only) */}
      {confirmLeaveOpen && (
        <div className="smc-modal-backdrop">
          <div className="smc-modal">
            <h3 className="smc-modal-title">End consultation now?</h3>
            <p className="smc-modal-text">
              The scheduled consultation time has not ended yet. This will only leave the call on this device. Use "End for all" if you want to close the session for everyone and record the final outcome.
            </p>
            <div className="smc-modal-actions">
              <button className="smc-modal-btn smc-modal-btn--secondary" onClick={()=>{ setConfirmLeaveOpen(false); }}>Resume call</button>
              <button className="smc-modal-btn smc-modal-btn--danger" onClick={confirmAndHangup}>End now</button>
            </div>
          </div>
        </div>
      )}

      {/* Leave or End for all selection */}
      {endOptionsOpen && (
        <div className="smc-modal-backdrop">
          <div className="smc-modal smc-modal--compact">
            <h3 className="smc-modal-title">Choose how to exit</h3>
            <p className="smc-modal-text">Leave the call locally or end it for everyone.</p>
            <div className="smc-modal-actions">
              <button onClick={()=>{
                if (endActionGuardRef.current) return; endActionGuardRef.current = true;
                setEndOptionsOpen(false);
                try { handleHangup(); } finally {
                  setTimeout(()=>{ endActionGuardRef.current = false; }, 800);
                }
              }} className="smc-modal-btn smc-modal-btn--secondary">Leave call</button>
              {isAdvisor && (
                <button onClick={async ()=>{
                  setEndOptionsOpen(false);
                  setAdvisorDecisionOpen(true);
                  setAdvisorOutcome('completed');
                  setAdvisorOutcomeReason('student_left_early');
                  setAdvisorOutcomeNotes('');
                }} className="smc-modal-btn smc-modal-btn--danger">End for all</button>
              )}
              <button className="smc-modal-btn smc-modal-btn--ghost" onClick={()=> setEndOptionsOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Advisor decision modal shown after call.session_ended (end for all) */}
      {advisorDecisionOpen && (
        <div className="smc-modal-backdrop">
          <div className="smc-modal smc-modal--compact">
            <h3 className="smc-modal-title">Finalize consultation outcome</h3>
            <p className="smc-modal-text">
              Before ending the call for everyone, choose how this consultation should be recorded.
            </p>
            <div className="smc-modal-stack">
              <div className="smc-outcome-grid">
                <button
                  type="button"
                  onClick={()=> setAdvisorOutcome('completed')}
                  className={`smc-outcome-card ${advisorOutcome === 'completed' ? 'is-selected is-success' : ''}`}
                >
                  <strong className="smc-outcome-title">Completed</strong>
                  <span className="smc-outcome-copy">The consultation happened and reached a usable outcome.</span>
                </button>
                <button
                  type="button"
                  onClick={()=> setAdvisorOutcome('incomplete')}
                  className={`smc-outcome-card ${advisorOutcome === 'incomplete' ? 'is-selected is-warning' : ''}`}
                >
                  <strong className="smc-outcome-title">Incomplete</strong>
                  <span className="smc-outcome-copy">The consultation started but could not be completed properly.</span>
                </button>
              </div>

              {advisorOutcome === 'incomplete' ? (
                <div className="smc-modal-field-stack">
                  <select className="smc-modal-field" value={advisorOutcomeReason} onChange={(e)=> setAdvisorOutcomeReason(e.target.value)}>
                    <option value="student_left_early">Student left early</option>
                    <option value="advisor_ended_early">Advisor ended early</option>
                    <option value="technical_issue">Technical issue</option>
                    <option value="connectivity_problem">Connectivity problem</option>
                    <option value="time_ran_out">Time ran out</option>
                    <option value="emergency">Emergency</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea
                    className="smc-modal-field smc-modal-field--textarea"
                    value={advisorOutcomeNotes}
                    onChange={(e)=> setAdvisorOutcomeNotes(e.target.value)}
                    rows={4}
                    placeholder="Add details or specify the reason"
                  />
                </div>
              ) : null}

              <div className="smc-modal-actions">
                <button
                  className="smc-modal-btn smc-modal-btn--secondary"
                  onClick={()=> setAdvisorDecisionOpen(false)}
                  disabled={submittingAdvisorOutcome}
                >
                  Back
                </button>
                <button
                  className={`smc-modal-btn ${advisorOutcome === 'completed' ? 'smc-modal-btn--brand' : 'smc-modal-btn--warning'}`}
                  onClick={submitAdvisorOutcome}
                  disabled={submittingAdvisorOutcome || (advisorOutcome === 'incomplete' && !advisorOutcomeReason)}
                >
                  {submittingAdvisorOutcome ? 'Saving...' : (advisorOutcome === 'completed' ? 'End and mark completed' : 'End and mark incomplete')}
                </button>
              </div>
              {advisorOutcomeError ? (
                <div className="smc-modal-error" role="alert">{advisorOutcomeError}</div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {earlyFinalizeWarningOpen && (
        <div className="smc-modal-backdrop">
          <div className="smc-modal smc-modal--narrow">
            <h3 className="smc-modal-title">End consultation early?</h3>
            <p className="smc-modal-text">
              There {getRemainingSessionMs() > 60000 ? 'are' : 'is'} still {formatRemainingSession(getRemainingSessionMs())} left in this consultation slot.
              {' '}Are you sure you want to end it now and mark it as {advisorOutcome === 'completed' ? 'completed' : 'incomplete'}?
            </p>
            <div className="smc-warning-note">
              The session will close for everyone and the remaining slot time will be forfeited.
            </div>
            <div className="smc-modal-actions">
              <button
                className="smc-modal-btn smc-modal-btn--secondary"
                onClick={() => setEarlyFinalizeWarningOpen(false)}
                disabled={submittingAdvisorOutcome}
              >
                Go back
              </button>
              <button
                className={`smc-modal-btn ${advisorOutcome === 'completed' ? 'smc-modal-btn--brand' : 'smc-modal-btn--warning'}`}
                onClick={performAdvisorOutcomeSubmit}
                disabled={submittingAdvisorOutcome}
              >
                {submittingAdvisorOutcome ? 'Saving...' : `Yes, end early`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student early leave prompt */}
      {studentLeavePromptOpen && (
        <div className="smc-modal-backdrop">
          <div className="smc-modal smc-modal--narrow">
            <h3 className="smc-modal-title">You left the meeting</h3>
            <p className="smc-modal-text">
              You can rejoin until the scheduled end time.
            </p>
            <div className="smc-modal-actions">
              <button className="smc-modal-btn smc-modal-btn--brand" onClick={()=>{ setStudentLeavePromptOpen(false); setInMeeting(true); setRejoinSeed(s=>s+1); }}>Resume call</button>
              <button className="smc-modal-btn smc-modal-btn--secondary" onClick={()=>{ setStudentLeavePromptOpen(false); if (onClose) onClose(); }}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamMeetCall;
