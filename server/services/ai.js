// Use dynamic import for ESM-only Gemini SDK in CommonJS environment
function normalizeModelName(name) {
  const raw = String(name || '').trim();
  const l = raw.toLowerCase();
  if (!l) return 'gemini-2.5-flash';
  // Strip "-latest" suffixes to prefer stable identifiers
  if (l.endsWith('-latest')) {
    return l.replace('-latest', '');
  }
  // Keep modern model names as-is (2.5/2.0)
  return raw;
}

async function getModel(apiKey, modelName) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = normalizeModelName(modelName || 'gemini-1.5-flash');
  return genAI.getGenerativeModel({ model });
}


function buildPrompt(transcript, topic, advisorName, studentName) {
  const advisor = advisorName || 'Advisor';
  const student = studentName || 'Student';
  const t = topic || 'N/A';
  return `
    You are a helpful summarizer.
    Summarize the provided text clearly and concisely.
    If the content does not appear to be an academic consultation between ${advisor} and ${student} about "${t}", briefly note the mismatch and still provide a neutral summary of the content.
    Use headings and bullet points where helpful.
    Transcript:
    ${transcript || ''}
  `;
}

async function summarizeConsultation(transcript, topic, advisorName, studentName) {
  const { AI_SUMMARY_ENABLED, AI_SUMMARY_API_KEY, AI_SUMMARY_MODEL } = process.env;
  if (String(AI_SUMMARY_ENABLED).toLowerCase() !== 'true') return null;
  const prompt = buildPrompt(transcript, topic, advisorName, studentName);
  if (!AI_SUMMARY_API_KEY) return null;
  const genAI = new (await import('@google/generative-ai')).GoogleGenerativeAI(AI_SUMMARY_API_KEY);
  const model = genAI.getGenerativeModel({ model: normalizeModelName(AI_SUMMARY_MODEL || 'gemini-2.5-flash') });
  try {
    const result = await model.generateContent(prompt);
    return result?.response?.text?.() || null;
  } catch (e) {
    console.error('AI Summary Error:', e);
    return null;
  }
}

module.exports = { summarizeConsultation };
