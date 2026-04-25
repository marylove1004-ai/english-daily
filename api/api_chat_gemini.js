// api/chat.js — Vercel Edge Function (Gemini 버전)
// Anthropic 형식 요청을 받아 Gemini API로 변환하여 전달

export const config = { runtime: 'edge' };

const GEMINI_MODEL = 'gemini-2.0-flash';
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

  // ── Anthropic 형식 → Gemini 형식 변환 ──────────────────────
  const anthropicBody = await req.json();
  const { system, messages, max_tokens, tools } = anthropicBody;

  const geminiBody = {
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens: max_tokens || 1000,
      temperature: 0.7,
    },
  };

  // 시스템 프롬프트
  if (system) {
    geminiBody.systemInstruction = { parts: [{ text: system }] };
  }

  // 웹 검색 도구 (뉴스 주제 가져올 때)
  const wantsSearch = tools?.some(t => t.name === 'web_search' || t.type?.includes('web_search'));
  if (wantsSearch) {
    geminiBody.tools = [{ googleSearch: {} }];
  }

  // ── Gemini API 호출 ─────────────────────────────────────────
  const upstream = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(JSON.stringify({ error: `Gemini API error: ${upstream.status}`, detail: errText }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const geminiData = await upstream.json();

  // ── Gemini 응답 → Anthropic 형식으로 변환 ──────────────────
  const text = geminiData.candidates?.[0]?.content?.parts
    ?.filter(p => p.text)
    ?.map(p => p.text)
    ?.join('') || '';

  const anthropicResponse = {
    content: [{ type: 'text', text }],
  };

  return new Response(JSON.stringify(anthropicResponse), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
