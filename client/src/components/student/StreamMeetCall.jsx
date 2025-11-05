import React, { useEffect, useRef, useState } from 'react';
import { StreamVideoClient, StreamVideo, StreamCall, StreamTheme, SpeakerLayout, CallControls } from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { BsX, BsRecordFill, BsStopFill } from 'react-icons/bs';
import './JitsiMeetCall.css';

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
  const [earlyEndPromptOpen, setEarlyEndPromptOpen] = useState(false);
  const [studentLeavePromptOpen, setStudentLeavePromptOpen] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const [rejoinSeed, setRejoinSeed] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle|recording|uploading|transcribing|done|error
  const [recordingError, setRecordingError] = useState('');

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
        const isAdvisor = roleVal === 'advisor';
        if (isAdvisor) {
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
            handleLeave();
          });
        } catch (_) {}
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

  useEffect(() => {
    const t = setInterval(() => {
      const end = scheduledEnd();
      const now = new Date();
      if (end) {
        const diff = end.getTime() - now.getTime();
        if (diff > 0) {
          const mins = Math.ceil(diff / 60000);
          setCountdownText(`Ends in ${mins} min${mins !== 1 ? 's' : ''}`);
        } else {
          setCountdownText('Ended');
        }
      } else {
        setCountdownText('');
      }
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinedAt, consultationData?.end_datetime, consultationData?.duration, consultationData?.duration_minutes]);

  async function startCombinedAudioCapture() {
    try {
      setRecordingError('');
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
        // Tab/system audio not available; we'll fallback to mic-only
        console.warn('Tab audio capture unavailable, falling back to mic-only recording:', e);
      }
      captureStreamRef.current = displayStream;

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      micStreamRef.current = micStream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ];
      let chosenType = '';
      for (const t of preferredTypes) {
        if (MediaRecorder.isTypeSupported(t)) { chosenType = t; break; }
      }
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
      }).catch(() => {});
    } catch (_) {}
  }

  function handleLeave() {
    // Stop capture to trigger upload
    stopCombinedAudioCapture();
    finalizeTranscript();
    const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const parsedUser = userRaw ? JSON.parse(userRaw) : null;
    const isAdvisor = String(parsedUser?.role || '').toLowerCase() === 'advisor';
    const end = scheduledEnd();
    const now = new Date();
    setInMeeting(false);
    if (end && now < end) {
      if (isAdvisor) {
        setEarlyEndPromptOpen(true);
      } else {
        setStudentLeavePromptOpen(true);
      }
    } else {
      if (isAdvisor && consultationData?.id) {
        try {
          fetch(`${API_BASE_URL}/api/consultations/${consultationData.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' }),
          }).catch(()=>{});
        } catch (_) {}
      }
      if (onClose) onClose();
    }
  }

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

  const toggleRecording = async () => {
    try {
      if (recordingStatus !== 'recording') {
        await startCombinedAudioCapture();
      } else {
        await stopCombinedAudioCapture();
      }
    } catch (err) {
      console.error('Toggle recording error:', err);
      setRecordingError(err?.message || String(err));
      setRecordingStatus('error');
    }
  };

  return (
    <div style={{position:'relative', width:'100%', height:'100%', background:'#0b1220'}}>
      {/* Toolbar with a close button */}
      <div style={{position:'absolute', top:12, left:12, zIndex:10001}}>
        <div style={{display:'flex', gap:8}}>
          <button onClick={handleHangup} title="Leave" style={{background:'rgba(17,24,39,0.8)', color:'#fff', border:'1px solid #374151', padding:8, borderRadius:8}}>
            <BsX size={20} />
          </button>
          <button
            onClick={toggleRecording}
            title={recordingStatus === 'recording' ? 'Stop local recording' : 'Start local recording'}
            style={{background: recordingStatus === 'recording' ? 'rgba(220,38,38,0.85)' : 'rgba(8,145,178,0.85)', color:'#fff', border:'1px solid #374151', padding:'6px 10px', borderRadius:8, display:'flex', alignItems:'center', gap:6}}
          >
            {recordingStatus === 'recording' ? <BsStopFill size={16} /> : <BsRecordFill size={16} />}
            <span style={{fontSize:12}}>{recordingStatus === 'recording' ? 'Stop' : 'Record'}</span>
          </button>
        </div>
      </div>

      {/* Stream Call UI */}
      <div style={{position:'absolute', inset:0}}>
        {client && call && (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <StreamTheme>
                <SpeakerLayout />
                <CallControls />
              </StreamTheme>
            </StreamCall>
          </StreamVideo>
        )}
      </div>

      {/* Countdown overlay */}
      {inMeeting && countdownText && (
        <div style={{position:'fixed', top:12, left:60, background:'rgba(17,24,39,0.9)', color:'#fff', padding:'8px 12px', borderRadius:8, zIndex:10002, fontSize:13, border:'1px solid #374151'}}>
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

      {/* Early leave confirm modal */}
      {confirmLeaveOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10002}}>
          <div style={{background:'#111827', color:'#fff', padding:'20px', borderRadius:12, width:'90%', maxWidth:480, boxShadow:'0 10px 30px rgba(0,0,0,0.4)'}}>
            <h3 style={{margin:'0 0 8px 0', fontSize:18}}>End consultation now?</h3>
            <p style={{margin:'0 0 16px 0', fontSize:14, color:'#d1d5db'}}>
              The scheduled consultation time has not ended yet. Ending now will mark this consultation as completed.
            </p>
            <div style={{display:'flex', gap:12, justifyContent:'flex-end'}}>
              <button onClick={()=>{ setConfirmLeaveOpen(false); setInMeeting(true); setRejoinSeed(s=>s+1); }} style={{padding:'8px 12px', borderRadius:8, background:'#374151', color:'#fff', border:'1px solid #4b5563'}}>Resume call</button>
              <button onClick={confirmAndHangup} style={{padding:'8px 12px', borderRadius:8, background:'#10b981', color:'#fff', border:'1px solid #34d399'}}>End now</button>
            </div>
          </div>
        </div>
      )}

      {/* Advisor early leave prompt */}
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

      {/* Student early leave prompt */}
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

export default StreamMeetCall;