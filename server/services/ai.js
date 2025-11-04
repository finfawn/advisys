// Use dynamic import for ESM-only Gemini SDK in CommonJS environment
async function getModel(apiKey, modelName) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName || 'gemini-1.5-flash' });
}

function buildPrompt(transcript, topic, advisorName, studentName) {
  return `
    You are an academic consultation summarizer.
    Summarize the following consultation between ${advisorName || 'Advisor'} and ${studentName || 'Student'} about "${topic || 'N/A'}".
    Focus on key discussion points, advisor suggestions, and student action items.
    Format the output with headings and bullet points.
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

  const model = await getModel(AI_SUMMARY_API_KEY, AI_SUMMARY_MODEL);

  try {
    const prompt = buildPrompt(transcript, topic, advisorName, studentName);
    const result = await model.generateContent(prompt);
    return result?.response?.text?.() || null;
  } catch (error) {
    console.error('AI Summary Error:', error);
    return null;
  }
}

module.exports = { summarizeConsultation };