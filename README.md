# 📖 English Daily

AI 기반 영어 학습 앱. 매일 최신 뉴스 주제로 스피킹 연습 + 교정 + 표현 학습.

---

## 📁 파일 구조

```
english-daily/
├── public/
│   └── index.html      ← 웹 앱 (여기 수정 없음)
├── api/
│   └── chat.js         ← Vercel 배포용 서버리스 함수
├── server.js           ← 로컬 실행용 Node.js 서버
└── README.md
```

---

## 🖥️ 방법 A: 로컬에서 실행 (가장 빠름)

### 필요한 것
- [Node.js](https://nodejs.org) 설치 (npm 불필요)
- Anthropic API 키 ([console.anthropic.com](https://console.anthropic.com))

### 실행 방법

**Mac / Linux:**
```bash
cd english-daily
ANTHROPIC_API_KEY=sk-ant-여기에키입력 node server.js
```

**Windows (PowerShell):**
```powershell
cd english-daily
$env:ANTHROPIC_API_KEY="sk-ant-여기에키입력"
node server.js
```

**Windows (CMD):**
```cmd
cd english-daily
set ANTHROPIC_API_KEY=sk-ant-여기에키입력
node server.js
```

→ 브라우저에서 **http://localhost:3000** 열기

### 매일 빠르게 실행하기 (start 스크립트 만들기)

**Mac/Linux** — `start.sh` 파일 만들기:
```bash
#!/bin/bash
export ANTHROPIC_API_KEY="sk-ant-여기에키입력"
node /Users/이름/english-daily/server.js
```
실행: `chmod +x start.sh && ./start.sh`

**Windows** — `start.bat` 파일 만들기:
```bat
@echo off
set ANTHROPIC_API_KEY=sk-ant-여기에키입력
node C:\Users\이름\english-daily\server.js
pause
```

---

## 🌐 방법 B: Vercel 배포 (URL로 어디서든 접속)

### 필요한 것
- GitHub 계정
- [Vercel](https://vercel.com) 계정 (무료)
- Anthropic API 키

### 단계별 배포

**1. GitHub에 올리기**
```bash
cd english-daily
git init
git add .
git commit -m "English Daily 앱"
# GitHub에서 새 레포지터리 만들고:
git remote add origin https://github.com/아이디/english-daily.git
git push -u origin main
```

**2. Vercel 연결**
1. [vercel.com](https://vercel.com) 로그인
2. **"Add New Project"** 클릭
3. GitHub 레포지터리 선택
4. **"Deploy"** 클릭 (설정 변경 없음)

**3. API 키 설정**
1. Vercel 프로젝트 대시보드 → **Settings**
2. **Environment Variables**
3. 추가: `ANTHROPIC_API_KEY` = `sk-ant-여기에키입력`
4. **Redeploy** (Settings → Deployments → Redeploy)

→ `https://english-daily-아이디.vercel.app` 주소로 어디서든 접속 가능!

---

## 💡 사용 방법

1. **오늘의 주제 가져오기** — AI가 당일 뉴스에서 5가지 주제 선별
2. **주제 선택** — 관심 있는 것 하나 클릭
3. **요약 + 어휘** 읽기 (영어)
4. **스피킹 프롬프트**에 영어로 작성
5. **AI 피드백** — 교정 + 자연스러운 표현 3가지 + 추가 질문
6. **Follow-up 질문** 답변으로 마무리

🔥 **연속 학습 스트릭**이 자동으로 기록됩니다.

---

## ⚙️ API 비용 참고

하루 1회 학습 기준으로 API 호출은 약 4회입니다.
월간 약 **$1~3** 수준 (Claude Sonnet 4 기준).
[Anthropic Console](https://console.anthropic.com)에서 Usage 확인 가능.
