let admin = null;
function init() {
  if (admin) return admin;
  try {
    const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (privateKey.startsWith('-----BEGIN')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    if (!projectId || !clientEmail || !privateKey) return null;
    // eslint-disable-next-line
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
      });
    }
    return admin;
  } catch (_) {
    return null;
  }
}

async function verifyFirebaseIdToken(idToken) {
  const a = init();
  if (!a) throw new Error('Firebase Admin not configured');
  const decoded = await a.auth().verifyIdToken(String(idToken));
  return decoded;
}

module.exports = { verifyFirebaseIdToken };