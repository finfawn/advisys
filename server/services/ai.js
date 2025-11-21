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

async function bedrockInvoke({ prompt, model, region }) {
  const { BedrockRuntimeClient, ConverseCommand, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
  const client = new BedrockRuntimeClient({ region });
  try {
    const convo = new ConverseCommand({
      modelId: model,
      messages: [
        { role: 'user', content: [{ text: prompt }] }
      ],
      inferenceConfig: { maxTokens: 1024, temperature: 0.2 }
    });
    const out = await client.send(convo);
    const parts = out?.output?.message?.content || [];
    const text = parts.map(p => p?.text || '').filter(Boolean).join('\n').trim();
    if (text) return text;
  } catch (_) {}
  try {
    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
    };
    const res = await client.send(new InvokeModelCommand({ modelId: model, contentType: 'application/json', accept: 'application/json', body: Buffer.from(JSON.stringify(body)) }));
    const parsed = JSON.parse(Buffer.from(res.body).toString());
    const text = parsed?.content?.[0]?.text || null;
    return text;
  } catch (_) {
    return null;
  }
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
  const { AI_SUMMARY_ENABLED, AI_SUMMARY_API_KEY, AI_SUMMARY_MODEL, AI_PROVIDER, AWS_REGION, BEDROCK_MODEL, DEEPSEEK_API_KEY, DEEPSEEK_MODEL } = process.env;
  if (String(AI_SUMMARY_ENABLED).toLowerCase() !== 'true') return null;
  const provider = (AI_PROVIDER || 'google').toLowerCase();
  const prompt = buildPrompt(transcript, topic, advisorName, studentName);
  if (provider === 'bedrock') {
    const model = BEDROCK_MODEL || 'anthropic.claude-3-5-sonnet-20241022';
    const region = AWS_REGION || 'us-east-1';
    try {
      const text = await bedrockInvoke({ prompt, model, region });
      return text || null;
    } catch (e) {
      console.error('AI Summary Error:', e);
      return null;
    }
  } else if (provider === 'deepseek') {
    if (!DEEPSEEK_API_KEY) return null;
    const model = DEEPSEEK_MODEL || 'deepseek-chat';
    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 800 })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || null;
      return text;
    } catch (e) {
      console.error('AI Summary Error:', e);
      return null;
    }
  } else {
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
}

module.exports = { summarizeConsultation };