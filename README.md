# advisys
AdviSys: A web-based academic consultation management system for scheduling, documentation, and management of student-faculty consultations.

## JAAS (8x8) Video + Transcription

AdviSys integrates JaaS (Jitsi as a Service) for video consultations and supports automatic multi-language transcription using 8x8 Whisper.

### Prerequisites
- Set environment variables in `server/.env`:
  - `JAAS_APP_ID`, `JAAS_API_KEY_ID`, and `JAAS_PRIVATE_KEY_PATH` (RS256) or `JAAS_API_KEY_SECRET` (HS256)
  - Ensure DB is configured (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
- In JaaS Admin, enable 8x8 AI Services → Transcription for your app.
- Select Whisper as the transcription engine and set language detection to `auto` (supports English, Tagalog, Ilocano).

### How it works
- When an advisor clicks “Start Meeting”, the client renders Jitsi and automatically enables captions.
- The JWT used to join includes transcription feature flags.
- Real-time transcription can be delivered to AdviSys via a secure webhook.

### Webhook / Callback
Configure JaaS/8x8 to POST transcription results to your backend:
- URL: `POST {API_BASE_URL}/api/transcriptions`
- JSON payload:
  ```json
  {
    "meetingId": "advisys-<consultationId>",
    "advisorId": 123,
    "studentId": 456,
    "timestamp": "2025-11-03T10:15:30.123Z",
    "text": "recognized speech text",
    "speaker": "Advisor"
  }
  ```
- The server stores entries in `transcriptions` linked to the `consultations` row.

### Finalization
The client triggers transcript finalization on meeting leave:
- `POST {API_BASE_URL}/api/transcriptions/finalize`
- Body: `{ "meetingId": "advisys-<consultationId>" }`
- The server merges all entries for the meeting, adds speaker/timestamps, and saves to `consultations.final_transcript`.

### Notes
- In dev, ensure `VITE_JAAS_APP_ID` and `VITE_API_BASE_URL` are set in the client.
- The meeting room name follows `advisys-<consultationId>`; the backend writes this to `consultations.room_name` when the room becomes ready.
- If you prefer WebSockets for streaming, point JaaS to a WS endpoint and upsert entries similarly.
