# PDF Viewer SDK

Take-home assignment: a client-side PDF viewer SDK built with Vite, React, and TypeScript.

## Repository layout

| Folder | Contents |
|--------|----------|
| **A/** | Application source (Vite app) — run all npm commands from `A/` |
| **B/** | Architecture and design document — [`architecture.md`](B/architecture.md) |
| **C/** | Cursor AI usage log — [see `C/README.md`](C/README.md) |

## Prerequisites

- Node.js 20+ recommended

## Setup and dev server

```bash
cd A
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You should see a minimal placeholder page until later phases wire the viewer.

Bundled sample PDFs are served at `/samples/sample-basic.pdf` and `/samples/sample-large.pdf`.

## Build

```bash
cd A
npm run build
npm run preview
```

## Lint

```bash
cd A
npm run lint
```
