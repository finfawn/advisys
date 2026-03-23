const fs = require('fs');
const path = require('path');
const MAILJET_API_KEY = (process.env.MAILJET_API_KEY || '').trim();
const MAILJET_API_SECRET = (process.env.MAILJET_API_SECRET || '').trim();
const MAIL_FROM = (process.env.MAIL_FROM || '').trim();
const MAIL_FROM_NAME = (process.env.MAIL_FROM_NAME || '').trim();

async function sendEmail({ to, subject, html }) {
  const fromDomain = MAIL_FROM.includes('@') ? MAIL_FROM.split('@').pop().toLowerCase() : '';
  if (fromDomain && ['gmail.com','yahoo.com','hotmail.com','outlook.com','live.com','aol.com','icloud.com'].includes(fromDomain)) {
    console.warn('Warning: MAIL_FROM uses a public email domain; Mailjet may require a verified sender/domain.');
  }
  if (!MAILJET_API_KEY || !MAILJET_API_SECRET || !MAIL_FROM) {
    try {
      const dir = path.join(__dirname, '..', 'outbox');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const name = `${Date.now()}_${String(to).replace(/[^a-zA-Z0-9._-]/g,'_')}.html`;
      const file = path.join(dir, name);
      const head = `<meta charset="utf-8"><title>${subject}</title>`;
      const body = `<h3>${subject}</h3><div>${html}</div>`;
      fs.writeFileSync(file, `${head}${body}`, 'utf8');
      console.log('Email written to outbox:', file);
      return { ok: true, file };
    } catch (e) {
      console.warn('Email dev outbox failed:', e?.message || String(e));
      return { ok: false, skipped: true };
    }
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
  console.log('Sending email via Mailjet:', { to, subject, html: html.substring(0, 100) + '...' });
  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Mailjet email failed:', res.status, text, payload);
  }
  return { ok: res.ok };
}

module.exports = { sendEmail };
