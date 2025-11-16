const { request } = require('undici');

const MAILJET_API_KEY = (process.env.MAILJET_API_KEY || '').trim();
const MAILJET_API_SECRET = (process.env.MAILJET_API_SECRET || '').trim();
const MAIL_FROM = (process.env.MAIL_FROM || '').trim();
const MAIL_FROM_NAME = (process.env.MAIL_FROM_NAME || '').trim();

async function sendEmail({ to, subject, html }) {
  if (!MAILJET_API_KEY || !MAILJET_API_SECRET || !MAIL_FROM) {
    console.warn('Email not configured: missing MAILJET_API_KEY, MAILJET_API_SECRET or MAIL_FROM');
    return { ok: false, skipped: true };
  }
  const auth = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_API_SECRET}`).toString('base64');
  const payload = {
    Messages: [
      {
        From: MAIL_FROM_NAME ? { Email: MAIL_FROM, Name: MAIL_FROM_NAME } : { Email: MAIL_FROM },
        To: [{ Email: to }],
        Subject: subject,
        HTMLPart: html,
      },
    ],
  };
  const res = await request('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const ok = res.statusCode >= 200 && res.statusCode < 300;
  if (!ok) {
    const text = await res.body.text();
    console.error('Mailjet email failed:', res.statusCode, text);
  }
  return { ok };
}

module.exports = { sendEmail };