#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  Language Daily — 로컬 서버 (Gemini 전용)
//  실행: GEMINI_API_KEY=AIzaSy... node server.js
//  그 다음 브라우저에서 http://localhost:3000 열기
// ─────────────────────────────────────────────────────────────
'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY || '';
const HTML    = path.join(__dirname, 'public', 'index.html');
const GEMINI_MODEL = 'gemini-2.5-pro';

// ── Gemini API 프록시 ──────────────────────────────────────────
function proxyToGemini(reqBody, res) {
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' }));
    return;
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(reqBody);
  } catch (e) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Invalid JSON format in request' }));
    return;
  }

  const { system, messages, tools } = parsedBody;
  
  const geminiBody = {
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { temperature: 0.6 },
  };

  if (system) {
    geminiBody.systemInstruction = { parts: [{ text: system }] };
  }

  const wantsSearch = tools?.some(t => t.name === 'web_search' || t.type?.includes('web_search'));
  if (wantsSearch) {
    geminiBody.tools = [{ googleSearch: {} }];
  }

  const payload = Buffer.from(JSON.stringify(geminiBody), 'utf8');

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let rawData = '';
    proxyRes.on('data', chunk => { rawData += chunk; });
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      
      if (proxyRes.statusCode !== 200) {
        res.end(JSON.stringify({ error: `Gemini API Error`, details: rawData }));
        return;
      }

      try {
        const data = JSON.parse(rawData);
        const text = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '';
        res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
      } catch (e) {
        res.end(JSON.stringify({ error: 'Failed to parse Gemini response' }));
      }
    });
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gemini API 연결 실패: ' + e.message }));
  });

  proxyReq.write(payload);
  proxyReq.end();
}

// ── 요청 핸들러 ───────────────────────────────────────────────
function handler(req, res) {
  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // 앱 HTML 서빙
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    try {
      const html = fs.readFileSync(HTML, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(500);
      res.end('public/index.html 파일을 찾을 수 없습니다.');
    }
    return;
  }

  // Gemini API 프록시 라우트 연결
  if (req.method === 'POST' && url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => proxyToGemini(body, res));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

// ── 서버 시작 ─────────────────────────────────────────────────
const server = http.createServer(handler);
server.listen(PORT, '127.0.0.1', () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║       📰  Language Daily 서버         ║');
  console.log('╠═══════════════════════════════════════╣');
  if (!API_KEY) {
    console.log('║  ⚠️  API 키가 설정되지 않았습니다!      ║');
    console.log('║                                       ║');
    console.log('║  아래 방법으로 실행하세요:              ║');
    console.log('║  Mac/Linux:                           ║');
    console.log('║  GEMINI_API_KEY=AIzaSy... \\           ║');
    console.log('║    node server.js                     ║');
    console.log('║                                       ║');
    console.log('║  Windows (PowerShell):                ║');
    console.log('║  $env:GEMINI_API_KEY="AIzaSy..."      ║');
    console.log('║  node server.js                       ║');
  } else {
    console.log('║  ✅ Gemini API 키 확인됨              ║');
  }
  console.log('╠═══════════════════════════════════════╣');
  console.log('║  👉  http://localhost:' + PORT + '          ║');
  console.log('╚═══════════════════════════════════════╝\n');
});
