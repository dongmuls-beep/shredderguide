# Copyland Shredder Guide

카피어랜드 문서세단기 선택 AI 에이전트 웹사이트입니다.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Vitest + Testing Library
- Playwright
- GitHub Pages static export

## Local Run

```bash
npm install
npm run dev
```

## Data Refresh

`SHEET_CSV_URL` 환경변수에 공개 Google Sheet CSV URL을 넣고 실행합니다.

```bash
npm run data:refresh
```

## Test

```bash
npm test
npm run test:e2e
```

## Build for GitHub Pages

```bash
NODE_ENV=production GITHUB_REPOSITORY=<owner>/<repo> npm run build
```

`out/` 폴더를 GitHub Pages 아티팩트로 배포합니다.
