#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  English Daily — 로컬 서버
//  실행: ANTHROPIC_API_KEY=sk-ant-... node server.js
//  그 다음 브라우저에서 http://localhost:3000 열기
// ─────────────────────────────────────────────────────────────
'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const HTML    = path.join(__dirname, 'public', 'index.html');

// ── Anthropic 프록시 ──────────────────────────────────────────
function proxyToAnthropic(reqBody, res) {
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' }));
    return;
  }

  const buf = Buffer.from(reqBody, 'utf8');
  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type':       'application/json',
      'Content-Length':     buf.length,
      'x-api-key':          API_KEY,
      'anthropic-version':  '2023-06-01',
      'anthropic-beta':     'web-search-2025-03-05',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Anthropic API 연결 실패: ' + e.message }));
  });

  proxyReq.write(buf);
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

  // Anthropic API 프록시
  if (req.method === 'POST' && url === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => proxyToAnthropic(body, res));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
}

// ── 서버 시작 ─────────────────────────────────────────────────
const server = http.createServer(handler);
server.listen(PORT, '127.0.0.1', () => {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║       📖  English Daily 서버           ║');
  console.log('╠═══════════════════════════════════════╣');
  if (!API_KEY) {
    console.log('║  ⚠️  API 키가 설정되지 않았습니다!      ║');
    console.log('║                                       ║');
    console.log('║  아래 방법으로 실행하세요:              ║');
    console.log('║  Mac/Linux:                           ║');
    console.log('║  ANTHROPIC_API_KEY=sk-ant-... \\       ║');
    console.log('║    node server.js                     ║');
    console.log('║                                       ║');
    console.log('║  Windows (PowerShell):                ║');
    console.log('║  $env:ANTHROPIC_API_KEY="sk-ant-..."  ║');
    console.log('║  node server.js                       ║');
  } else {
    console.log('║  ✅ API 키 확인됨                      ║');
  }
  console.log('╠═══════════════════════════════════════╣');
  console.log('║  👉  http://localhost:' + PORT + '           ║');
  console.log('╚═══════════════════════════════════════╝\n');
});
