import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StreamVideoClient, StreamVideo, StreamCall, StreamTheme, SpeakerLayout, PaginatedGridLayout, CallParticipantsList, CallControls, useCallStateHooks } from '@stream-io/video-react-sdk';
import { StreamChat } from 'stream-chat';
import { Chat, Channel, Window, MessageList, MessageInput } from 'stream-chat-react';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import 'stream-chat-react/dist/css/v2/index.css';
import { BsChatDots, BsClock, BsGrid1X2, BsPeople, BsBroadcastPin, BsInfoCircle } from 'react-icons/bs';
import { toast } from '../hooks/use-toast';
import Logo from '../../assets/logo.png';
import { UsersIcon, Squares2X2Icon, ChatBubbleLeftRightIcon, DocumentTextIcon, XCircleIcon, RecordCircleIcon } from '../icons/Heroicons';

import './StreamMeetCall.css';

const sidePanelTransition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

const sidePanelVariants = {
  hidden: {
    opacity: 0,
    x: 26,
    scale: 0.985,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    x: 18,
    scale: 0.985,
    filter: 'blur(8px)',
  },
};

const sidePanelContentVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.06,
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

const roomLayoutTransition = {
  layout: {
    duration: 0.34,
    ease: [0.22, 1, 0.36, 1],
  },
};

const formatElapsedDuration = (joinedAt) => {
  if (!joinedAt) return 'Not started';

  const totalSeconds = Math.max(0, Math.round((Date.now() - joinedAt.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
};

const MeetingPanelFrame = ({ icon: Icon, title, onClose, children }) => (
  <>
    <div className="smc-side-panel__header">
      <div className="smc-side-panel__title">
        <Icon />
        <span>{title}</span>
      </div>
      <button className="smc-panel-close" onClick={onClose} type="button">Close</button>
    </div>
    {children}
  </>
);

const ChatEmptyState = () => (
  <div className="smc-chat-empty-state" role="status">
    <div className="smc-chat-empty-state__icon">
      <BsChatDots />
    </div>
    <strong>Start chatting</strong>
    <span>Share updates, links, or quick notes for this consultation.</span>
  </div>
);

const MeetingHeader = ({
  consultationData,
  countdownText,
  recordingStatus,
  activePanel,
  layoutName,
  onTogglePanel,
  onToggleLayout,
}) => {
  const { useParticipants, useCallStatsReport } = useCallStateHooks();
  const participants = useParticipants ? useParticipants() : [];
  const stats = useCallStatsReport ? useCallStatsReport() : null;
  const latency = stats?.publisherStats?.averageRoundTripTimeInMs;
  const meetingTitle = consultationData?.title || consultationData?.topic || 'Consultation Meeting';
  const meetingMeta = consultationData?.category || consultationData?.consultationCategory || consultationData?.mode || 'Consultation';

  return (
    <header className="smc-meeting-header">
      <div className="smc-brand-block">
        <img src={Logo} alt="AdviSys" className="smc-brand-mark" />
        <div className="smc-brand-copy">
          <span className="smc-brand-eyebrow">{meetingMeta}</span>
          <strong className="smc-brand-title">
            {meetingTitle}
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
            className={`smc-header-chip smc-header-chip--latency ${activePanel === 'details' ? 'is-active' : ''}`}
            onClick={() => onTogglePanel('details')}
          >
            <BsBroadcastPin />
            <span>{Math.round(latency)} ms</span>
          </button>
        ) : null}
        {recordingStatus === 'recording' || recordingStatus === 'uploading' ? (
          <div className={`smc-header-chip ${recordingStatus === 'uploading' ? 'smc-header-chip--saving' : 'smc-header-chip--recording'}`}>
            <span className="smc-recording-pip" />
            <span>{recordingStatus === 'uploading' ? 'Saving recording' : 'Recording'}</span>
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
  const finalizeRecordingAfterStopRef = useRef(false);

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
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle|recording|uploading|error
  const [recordingError, setRecordingError] = useState('');
  const [chatClient, setChatClient] = useState(null);
  const [chatChannel, setChatChannel] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
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
    let chatInstance = null;
    (async () => {
      try {
        const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const parsedUser = userRaw ? JSON.parse(userRaw) : null;
        const userId = String(parsedUser?.id || 'user');
        const fullName = parsedUser?.full_name || displayName || 'User';
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
          chatInstance = sc;
          const channelId = `advisys-${consultationData?.id || callId}`;
          const members = [userId].filter(Boolean);
          // Attempt to include advisor/student IDs if present in consultationData
          const sid = consultationData?.student_user_id || consultationData?.studentId || consultationData?.student?.id;
          const aid = consultationData?.advisor_user_id || consultationData?.advisorId || consultationData?.advisor?.id;
          if (sid && !members.includes(String(sid))) members.push(String(sid));
          if (aid && !members.includes(String(aid))) members.push(String(aid));
          const ch = sc.channel('livestream', channelId, { name: `Consultation ${consultationData?.id || ''}`, members });
          await ch.watch();
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
      stopCombinedAudioCapture({ finalizeAfterStop: true });
      setChatChannel(null);
      setChatClient(null);
      if (chatInstance) {
        chatInstance.disconnectUser().catch(() => {});
      }
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
    })();
  }, [rejoinSeed, inMeeting, call]);

  // countdown is handled in the main timer effect above

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

  
  function buildRecordingFileName() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `consultation-${consultationData?.id || 'meeting'}-${stamp}.webm`;
  }

  async function startCombinedAudioCapture() {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') return;
      if (!consultationData?.id) throw new Error('Missing consultation ID');
      setRecordingError('');
      finalizeRecordingAfterStopRef.current = false;
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
          mediaRecorderRef.current = null;
          recordingChunksRef.current = [];
          if (!blob.size) {
            finalizeRecordingAfterStopRef.current = false;
            setRecordingStatus('idle');
            toast.warning({
              title: 'Recording empty',
              description: 'No audio was captured for this recording.',
            });
            return;
          }
          await uploadAudioBlob(blob);
          if (finalizeRecordingAfterStopRef.current) {
            finalizeRecordingAfterStopRef.current = false;
            finalizeTranscript();
          }
        } catch (err) {
          console.error('Recorder stop/upload error', err);
          finalizeRecordingAfterStopRef.current = false;
          setRecordingError(err?.message || String(err));
          setRecordingStatus('error');
        }
      };
      mr.start();
      setRecordingStatus('recording');
      toast.info({
        title: 'Recording started',
        description: 'The meeting will keep recording until you press the record button again.',
      });
    } catch (err) {
      console.error('Failed to start tab audio capture:', err);
      setRecordingError(err?.message || String(err));
      setRecordingStatus('error');
      toast.destructive({
        title: 'Recording failed',
        description: err?.message || 'Unable to start recording.',
      });
    }
  }

  async function stopCombinedAudioCapture({ finalizeAfterStop = false } = {}) {
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        finalizeRecordingAfterStopRef.current = finalizeAfterStop;
        setRecordingStatus('uploading');
        recorder.stop();
      } else if (finalizeAfterStop) {
        finalizeRecordingAfterStopRef.current = false;
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
      fd.append('file', blob, buildRecordingFileName());
      fd.append('consultationId', String(consultationData.id));
      // Do not use keepalive for large audio uploads; browsers may drop bodies >64KB
      const res = await fetch(`${API_BASE_URL}/api/transcriptions/upload`, { method: 'POST', body: fd });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Upload/transcription failed');
      }
      setRecordingStatus('idle');
      toast.success({
        title: 'Recording saved',
        description: data?.recordingUri
          ? `Saved to ${data.recordingUri}`
          : 'The recording has been uploaded successfully.',
      });
    } catch (err) {
      console.error('Upload error:', err);
      setRecordingError(err?.message || String(err));
      setRecordingStatus('error');
      toast.destructive({
        title: 'Recording upload failed',
        description: err?.message || 'Unable to save the recording.',
      });
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
    if (recordingStatus === 'recording') {
      stopCombinedAudioCapture({ finalizeAfterStop: true });
    }
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

  const isRecordingActive = recordingStatus === 'recording';
  const isRecordingBusy = recordingStatus === 'uploading';

  const handleRecordingToggle = async () => {
    if (isRecordingBusy) return;

    if (isRecordingActive) {
      await stopCombinedAudioCapture({ finalizeAfterStop: true });
      return;
    }

    await startCombinedAudioCapture();
  };

  const recordingButtonTitle = isRecordingBusy
    ? 'Saving recording'
    : isRecordingActive
      ? 'Stop and save recording'
      : 'Start recording';

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
  const togglePanel = (panelName) => {
    setActivePanel((current) => current === panelName ? null : panelName);
  };
  const closePanel = () => setActivePanel(null);
  const MeetingDetailsPanelV2 = ({ onClose }) => {
    const { useParticipants, useHasOngoingScreenShare, useMicrophoneState, useCameraState } = useCallStateHooks();
    const participants = useParticipants ? useParticipants() : [];
    const hasScreenShare = useHasOngoingScreenShare ? useHasOngoingScreenShare() : false;
    const { isMute: micMuted } = useMicrophoneState ? useMicrophoneState() : { isMute: false };
    const { isMute: camMuted } = useCameraState ? useCameraState() : { isMute: false };
    const duration = formatElapsedDuration(joinedAt);

    return (
      <MeetingPanelFrame icon={BsInfoCircle} title="Details" onClose={onClose}>
        <div className="smc-side-panel__body smc-side-panel__body--details" role="dialog" aria-label="Call details">
          <section className="smc-detail-section">
            <span className="smc-detail-label">Participants</span>
            <strong className="smc-detail-value">{participants?.length || 0}</strong>
          </section>
          <section className="smc-detail-section">
            <span className="smc-detail-label">Consultation</span>
            <strong className="smc-detail-value">{consultationData?.category || consultationData?.consultationCategory || consultationData?.mode || 'Meeting'}</strong>
          </section>
          <section className="smc-detail-grid">
            <div className="smc-detail-card">
              <span className="smc-detail-card__label">Screenshare</span>
              <strong className="smc-detail-card__value">{hasScreenShare ? 'On' : 'Off'}</strong>
            </div>
            <div className="smc-detail-card">
              <span className="smc-detail-card__label">Mic</span>
              <strong className="smc-detail-card__value">{micMuted ? 'Muted' : 'On'}</strong>
            </div>
            <div className="smc-detail-card">
              <span className="smc-detail-card__label">Camera</span>
              <strong className="smc-detail-card__value">{camMuted ? 'Off' : 'On'}</strong>
            </div>
            <div className="smc-detail-card">
              <span className="smc-detail-card__label">Duration</span>
              <strong className="smc-detail-card__value">{duration}</strong>
            </div>
          </section>
        </div>
      </MeetingPanelFrame>
    );
  };

  const _MeetingDetailsPanelLegacy = ({ onClose }) => {
    const { useParticipants, useHasOngoingScreenShare, useMicrophoneState, useCameraState } = useCallStateHooks();
    const participants = useParticipants ? useParticipants() : [];
    const hasScreenShare = useHasOngoingScreenShare ? useHasOngoingScreenShare() : false;
    const { isMute: micMuted } = useMicrophoneState ? useMicrophoneState() : { isMute: false };
    const { isMute: camMuted } = useCameraState ? useCameraState() : { isMute: false };
    const duration = joinedAt ? Math.max(0, Math.round((Date.now() - joinedAt.getTime())/1000)) + 's' : '—';
    return (
      <>
        <div className="smc-chat-header smc-chat-header--panel">
          <div className="smc-panel-title">
            <BsInfoCircle />
            <span>Details</span>
          </div>
          <button className="smc-panel-close" onClick={onClose}>Close</button>
        </div>
        <div className="smc-side-panel__body smc-side-panel__body--details" role="dialog" aria-label="Call details">
          <section className="smc-detail-section">
            <span className="smc-detail-label">Participants</span>
            <strong className="smc-detail-value">{participants?.length || 0}</strong>
          </section>
          <section className="smc-detail-section">
            <span className="smc-detail-label">Consultation</span>
            <strong className="smc-detail-value">{consultationData?.category || consultationData?.consultationCategory || consultationData?.mode || 'Meeting'}</strong>
          </section>
          <section className="smc-detail-grid">
            <div className="smc-detail-card">
              <span className="smc-detail-card__label">Screenshare</span>
              <strong className="smc-detail-card__value">{hasScreenShare ? 'On' : 'Off'}</strong>
            </div>
            <div className="smc-detail-card">
              <span className="smc-detail-card__label">Mic</span>
              <strong className="smc-detail-card__value">{micMuted ? 'Muted' : 'On'}</strong>
            </div>
            <div className="smc-detail-card">
              <span className="smc-detail-card__label">Camera</span>
              <strong className="smc-detail-card__value">{camMuted ? 'Off' : 'On'}</strong>
            </div>
            <div className="smc-detail-card">
              <span className="smc-detail-card__label">Duration</span>
              <strong className="smc-detail-card__value">{duration}</strong>
            </div>
          </section>
        </div>
      </>
    );
  };

  const renderSidePanel = () => {
    if (!activePanel) return null;

    const panelProps = {
      key: activePanel,
      layout: true,
      initial: 'hidden',
      animate: 'visible',
      exit: 'exit',
      variants: sidePanelVariants,
      transition: sidePanelTransition,
      className: `smc-side-panel smc-side-panel--${activePanel}`,
      role: 'complementary',
    };

    if (activePanel === 'people') {
      return (
        <motion.aside {...panelProps}>
          <CallParticipantsList onClose={closePanel} />
        </motion.aside>
      );
    }

    if (activePanel === 'details') {
      return (
        <motion.aside {...panelProps}>
          <MeetingDetailsPanelV2 onClose={closePanel} />
        </motion.aside>
      );
    }

    return (
      <motion.aside {...panelProps}>
        <MeetingPanelFrame icon={BsChatDots} title="Chat" onClose={closePanel}>
          <motion.div
            className="smc-chat-shell"
            variants={sidePanelContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
          {chatClient && chatChannel ? (
            <div className="smc-stream-chat">
              <Chat client={chatClient}>
                <Channel channel={chatChannel} EmptyStateIndicator={ChatEmptyState}>
                  <Window>
                    <MessageList />
                    <MessageInput additionalTextareaProps={{ placeholder: 'Send a message' }} />
                  </Window>
                </Channel>
              </Chat>
            </div>
          ) : (
            <div className="smc-chat-placeholder">
              <strong>Preparing chat</strong>
              <span>Messages will appear here once the consultation channel is ready.</span>
            </div>
          )}
          </motion.div>
        </MeetingPanelFrame>
      </motion.aside>
    );
  };

  return (
    <div className="smc-root">
      {isLoading ? (
        <div className="smc-loading-screen" aria-live="polite">
          <div className="smc-loading-brand" role="status" aria-label="Preparing your meeting">
            <span className="smc-loading-brand__backdrop" aria-hidden="true" />
            <div className="smc-loading-brand__stage" aria-hidden="true">
              <span className="smc-loading-brand__halo" />
              <span className="smc-loading-brand__orbit smc-loading-brand__orbit--outer" />
              <span className="smc-loading-brand__orbit smc-loading-brand__orbit--inner" />
              <span className="smc-loading-brand__logo-shell">
                <img
                  src="/logo-large-transparent.png"
                  alt="AdviSys"
                  className="smc-loading-brand__logo"
                />
              </span>
            </div>
            <div className="smc-loading-brand__text">
              <span className="smc-loading-brand__eyebrow">AdviSys</span>
              <span className="smc-loading-brand__copy">
                Preparing your meeting
                <span className="smc-loading-brand__ellipsis" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </span>
              <span className="smc-loading-brand__subcopy">
                Joining the room and checking your audio and video
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="smc-stage-canvas">
        {client && call && inMeeting ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <StreamTheme className={`str-video__theme-dark smc-theme ${activePanel ? 'smc-theme--panel-open' : ''}`}>
                <section className="smc-workspace">
                  <MeetingHeader
                  consultationData={consultationData}
                  countdownText={countdownText}
                  recordingStatus={recordingStatus}
                  activePanel={activePanel}
                  layoutName={layoutName}
                  onTogglePanel={togglePanel}
                  onToggleLayout={() => setLayoutName((current) => current === 'PaginatedGrid' ? 'Speaker' : 'PaginatedGrid')}
                  />

                  <motion.div
                    layout
                    transition={roomLayoutTransition}
                    className={`smc-room-shell ${activePanel ? 'smc-room-shell--panel-open' : ''}`}
                  >
                  <motion.div layout transition={roomLayoutTransition} className="smc-stage-shell">
                    <div className="smc-layout-frame">
                      {isGridLayout ? (
                        <PaginatedGridLayout />
                      ) : (
                        <SpeakerLayout participantsBarPosition="bottom" />
                      )}
                    </div>
                  </motion.div>

                  <AnimatePresence mode="popLayout" initial={false}>
                    {renderSidePanel()}
                  </AnimatePresence>
                  </motion.div>
                </section>

                <div className="smc-controls">
                  <CallControls />
                  <div className="smc-controls-divider" />
                  <button
                    className={`smc-utility-btn smc-record-btn ${isRecordingActive ? 'is-recording' : ''} ${isRecordingBusy ? 'is-saving' : ''}`}
                    onClick={handleRecordingToggle}
                    title={recordingButtonTitle}
                    type="button"
                    aria-label={recordingButtonTitle}
                    aria-pressed={isRecordingActive}
                    disabled={isRecordingBusy}
                  >
                    <RecordCircleIcon className="smc-utility-icon" />
                  </button>
                  <button
                    className={`smc-utility-btn ${layoutName === 'PaginatedGrid' ? 'is-active' : ''}`}
                    onClick={() => setLayoutName((current) => current === 'PaginatedGrid' ? 'Speaker' : 'PaginatedGrid')}
                    title={layoutName === 'PaginatedGrid' ? 'Switch to focus layout' : 'Switch to grid layout'}
                    type="button"
                  >
                    <Squares2X2Icon className="smc-utility-icon" />
                  </button>
                  <button
                    className={`smc-utility-btn ${activePanel === 'people' ? 'is-active' : ''}`}
                    onClick={() => togglePanel('people')}
                    title="Participants"
                    type="button"
                  >
                    <UsersIcon className="smc-utility-icon" />
                  </button>
                  <button
                    className={`smc-utility-btn ${activePanel === 'chat' ? 'is-active' : ''}`}
                    onClick={() => togglePanel('chat')}
                    title="Chat"
                    type="button"
                  >
                    <ChatBubbleLeftRightIcon className="smc-utility-icon" />
                  </button>
                  <button
                    className={`smc-utility-btn ${activePanel === 'details' ? 'is-active' : ''}`}
                    onClick={() => togglePanel('details')}
                    title="Meeting details"
                    type="button"
                  >
                    <DocumentTextIcon className="smc-utility-icon" />
                  </button>
                  <button className="smc-end-btn" onClick={()=> setEndOptionsOpen(true)} title="End call" type="button">
                    <XCircleIcon className="smc-utility-icon" />
                  </button>
                </div>

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
                  <label className="smc-modal-field-group">
                    <span className="smc-modal-field-label">Reason</span>
                    <select
                      className="smc-modal-field smc-modal-field--select"
                      value={advisorOutcomeReason}
                      onChange={(e)=> setAdvisorOutcomeReason(e.target.value)}
                    >
                      <option value="student_left_early">Student left early</option>
                      <option value="advisor_ended_early">Advisor ended early</option>
                      <option value="technical_issue">Technical issue</option>
                      <option value="connectivity_problem">Connectivity problem</option>
                      <option value="time_ran_out">Time ran out</option>
                      <option value="emergency">Emergency</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
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

