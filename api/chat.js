export const config = { runtime: 'edge' };

// 더 깊이 있고 풍부한 논리를 구사하는 Pro 모델 사용
const GEMINI_MODEL = 'gemini-2.5-pro';
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

  const reqBody = await req.json();
  const { system, messages, tools } = reqBody;

  const geminiBody = {
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: 0.6, // 시사/뉴스에 맞게 톤의 안정성을 높임 (0.6)
    },
  };

  if (system) {
    geminiBody.systemInstruction = { parts: [{ text: system }] };
  }

  // 웹 검색 도구 활성화
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
