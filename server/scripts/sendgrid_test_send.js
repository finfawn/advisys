require('dotenv').config();
const { sendEmail } = require('../services/email');

async function main() {
  const to = process.argv[2] || process.env.TEST_EMAIL_TO || process.env.MAIL_FROM;
  const from = process.env.MAIL_FROM;
  const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
  if (!apiKey || !from) {
    console.error('Missing SENDGRID_API_KEY or MAIL_FROM in environment.');
    process.exit(1);
  }
  if (!to) {
    console.error('Usage: node scripts/sendgrid_test_send.js <recipient_email>');
    console.error('Or set TEST_EMAIL_TO in .env.');
    process.exit(1);
  }

  const subject = 'AdviSys SendGrid Test';
  const html = `<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
    <h2>AdviSys SendGrid Test</h2>
    <p>This is a test email sent via SendGrid API from <strong>${from}</strong> to <strong>${to}</strong>.</p>
    <p>If you received this, SendGrid is configured correctly.</p>
  </div>`;

  try {
    const res = await sendEmail({ to, subject, html });
    if (res && res.ok) {
      console.log('Email sent successfully to', to);
    } else if (res && res.skipped) {
      console.error('Email send skipped: missing configuration.');
      process.exit(1);
    } else {
      console.error('Email send failed.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error sending email:', err);
    process.exit(1);
  }
}

main();