# AdviSys

AdviSys is a comprehensive web-based academic consultation management system designed to streamline the scheduling, documentation, and management of student-faculty consultations.

## Features

- **Role-Based Access**: Distinct portals for Students, Advisors, and Administrators.
- **Consultation Management**: Scheduling, rescheduling, and cancellation workflows.
- **Video Conferencing Integration**: Built-in support for virtual consultations via **GetStream.io**.
- **Automated Transcription & Summaries**: AI-powered transcription and meeting summaries.
- **Real-time Notifications**: Email and in-app notifications for appointments.
- **Analytics Dashboard**: Insights into consultation trends and feedback.

## Getting Started

For detailed instructions on how to set up the project locally, please refer to the **[INSTALLATION.md](INSTALLATION.md)** file.

### Quick Setup Summary

1.  **Clone** the repository.
2.  **Install dependencies** in both `server` and `client` folders.
3.  **Configure `.env` files** in both folders (manually create them).
4.  **Setup MySQL Database** and run initialization scripts.
5.  **Run** the development servers.

---

## Video & AI Integration Details

AdviSys supports video consultations using **Stream (GetStream.io)** and automatic multi-language transcription.

### Prerequisites for Video/AI
- Set environment variables in `server/.env`:
  - `STREAM_API_KEY`
  - `STREAM_API_SECRET`
  - Ensure DB is configured correctly.

### Webhook / Callback Configuration
For transcription results, ensure your backend is configured to receive and process transcription data if supported by your configuration.

### Transcript Finalization
The client triggers transcript finalization on meeting leave:
- `POST {API_BASE_URL}/api/transcriptions/finalize`
- Body: `{ "meetingId": "advisys-<consultationId>" }`

The server merges all entries for the meeting, adds speaker/timestamps, and saves to the database.
