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
  if (!AI_SUMMARY_API_KEY) {
    console.warn('AI_SUMMARY_API_KEY is not set; skipping summarization');
    return null;
  }

  const primaryName = normalizeModelName(AI_SUMMARY_MODEL || 'gemini-2.5-flash');
  const fallbacks = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite-001'
  ]
    .map(normalizeModelName)
    .filter((m, idx, arr) => arr.indexOf(m) === idx)
    .filter((m) => m !== primaryName);
  const prompt = buildPrompt(transcript, topic, advisorName, studentName);

  // Try primary model first
  try {
    const model = await getModel(AI_SUMMARY_API_KEY, primaryName);
    const result = await model.generateContent(prompt);
    return result?.response?.text?.() || null;
  } catch (error) {
    const msg = String(error?.message || error).toLowerCase();
    const status = String(error?.status || '').trim();
    const isNotFound = status === '404' || msg.includes('not found') || msg.includes('404');
    if (!isNotFound) {
      console.error('AI Summary Error:', error);
      return null;
    }
    // Retry with fallbacks on 404/model not found
    for (const fb of fallbacks) {
      try {
        const fbModel = await getModel(AI_SUMMARY_API_KEY, fb);
        const result = await fbModel.generateContent(prompt);
        return result?.response?.text?.() || null;
      } catch (e) {
        // continue to next fallback
      }
    }
    console.error('AI Summary Error: all model fallbacks failed', error);
    return null;
  }
}

module.exports = { summarizeConsultation };