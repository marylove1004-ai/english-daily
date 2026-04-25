// api/chat.js — Vercel Edge Function (Gemini 2.5 Flash)

export const config = { runtime: 'edge' };

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anthropicBody = await req.json();
  const { system, messages, tools } = anthropicBody;

  const geminiBody = {
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: 0.7,
      thinkingConfig: {
        thinkingBudget: 0,  // thinking 비활성화 (JSON 응답 안정성)
      },
    },
  };

  if (system) {
    geminiBody.systemInstruction = { parts: [{ text: system }] };
  }

  const wantsSearch = tools?.some(t => t.name === 'web_search' || t.type?.includes('web_search'));
  if (wantsSearch) {
    geminiBody.tools = [{ googleSearch: {} }];
  }

  const upstream = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  const rawText = await upstream.text();

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: `Gemini API error: ${upstream.status}`, detail: rawText }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let geminiData;
  try {
    geminiData = JSON.parse(rawText);
  } catch {
    return new Response(JSON.stringify({ error: 'Gemini 응답 파싱 실패', raw: rawText.slice(0, 300) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const text = geminiData.candidates?.[0]?.content?.parts
    ?.filter(p => p.text)
    ?.map(p => p.text)
    ?.join('') || '';

  return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
