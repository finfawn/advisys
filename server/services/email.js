const { request } = require('undici');

const SENDGRID_API_KEY = (process.env.SENDGRID_API_KEY || '').trim();
const MAIL_FROM = (process.env.MAIL_FROM || '').trim();
const MAIL_FROM_NAME = (process.env.MAIL_FROM_NAME || '').trim();

async function sendEmail({ to, subject, html }) {
  if (!SENDGRID_API_KEY || !MAIL_FROM) {
    console.warn('Email not configured: missing SENDGRID_API_KEY or MAIL_FROM');
    return { ok: false, skipped: true };
  }
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: MAIL_FROM_NAME ? { email: MAIL_FROM, name: MAIL_FROM_NAME } : { email: MAIL_FROM },
    subject,
    content: [{ type: 'text/html', value: html }],
  };
  const res = await request('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const ok = res.statusCode >= 200 && res.statusCode < 300;
  if (!ok) {
    const text = await res.body.text();
    console.error('SendGrid email failed:', res.statusCode, text);
  }
  return { ok };
}

module.exports = { sendEmail };