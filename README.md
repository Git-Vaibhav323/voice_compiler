# Voice Compiler Visualizer

A compiler-design teaching app built **from scratch**: speak (or type) what you want, get a C program generated for you, then watch **and hear** that program travel through all six phases of compilation.

No existing compiler visualizer was forked or wrapped. The UI, the Express backend, the Groq prompts, the offline C analyser, the narration engine, and the six-phase visualizations were written for this project.

```
speak  →  transcribe  →  AI writes C  →  six-phase analysis  →  narrate
 mic      Web Speech       Express + Groq     Express + Groq      speechSynthesis
 API                         (or type)        (local fallback)
```

Open the editor, press **Speak**, say something like *"write a bubble sort in C"*, and the app generates the source, tokenizes it, builds an AST, fills a symbol table, emits three-address code, optimizes it, and produces simple register-machine assembly — with a spoken explanation for every phase.

---

## Features

- **Voice in** — browser speech recognition (Chrome, Edge, Safari). Type instead if you prefer, or if the mic is unavailable.
- **AI code generation** — Groq turns a plain-language request into a short, self-contained C program (`main()`, sample data, classic C).
- **Six compiler phases** — lexical analysis, syntax (AST), semantic analysis, intermediate code (TAC), optimization, and target code generation.
- **Spoken narration** — click a phase card (or **Listen**) to hear an explanation of *this* program, not a generic script. Speed is adjustable.
- **Interactive AST** — D3 tree of the translation unit, functions, statements, and expressions.
- **Token table, TAC, optimizer, assembly** — dedicated views for each phase.
- **Secure backend** — the Groq API key never leaves the server. The browser only talks to `/api`.
- **Offline fallback** — a heuristic C analyser in the browser so visualization still works with no key and no network.
- **Built-in examples** — assignment, loops, conditionals, functions, arrays, and a full program.
- **Guide page** — `/how-it-works` walks through the phases and the voice workflow.
- **Production split** — static frontend on Netlify, API on Render, CORS locked to your site origin.

This is a **teaching tool**, not a real C front end. Pointers, structs, `malloc`, and the preprocessor are recognized but not deeply analysed.

---

## Architecture

The app is two processes that share one repo.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Vite + React)                                         │
│                                                                 │
│  VoiceInput ──► useSpeechRecognition (Web Speech API)           │
│       │                                                         │
│       ▼                                                         │
│  useCompiler ──► apiService ──► /api/generate-code              │
│       │                      ──► /api/analyze                   │
│       │                      ──► /api/health                    │
│       │                                                         │
│       ├── PhaseVisualization (six cards)                        │
│       ├── TokenTable / AST (react-d3-tree) / TAC / Optimizer    │
│       ├── narration.js ──► useSpeech (speechSynthesis)          │
│       └── localAnalyzer.js   (if backend is down or has no key) │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP JSON
                                │  local: Vite proxies /api → :5174
                                │  prod:  VITE_API_BASE_URL → Render
┌───────────────────────────────▼─────────────────────────────────┐
│  Express (server/index.js)                                      │
│                                                                 │
│  GROQ_API_KEY stays here. CORS via ALLOWED_ORIGIN.              │
│                                                                 │
│  POST /api/generate-code  →  prompts.buildCodeGenPrompt         │
│  POST /api/analyze        →  prompts.buildAnalysisPrompt (JSON) │
│  GET  /api/health         →  { status, hasApiKey, models }      │
│                                                                 │
│                         ▼                                       │
│              Groq Chat Completions                              │
│         llama-3.3-70b-versatile (configurable)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Request flow

1. **Speak or type.** `VoiceInput` records a request. Recognition uses `SpeechRecognition` / `webkitSpeechRecognition`. You can edit the transcript before generating.
2. **Generate.** `POST /api/generate-code` with `{ request }`. The server calls Groq with a prompt that demands a short, complete C program and strips markdown fences if the model adds them.
3. **Editor.** Generated source lands in `CodeInput`. Analysis starts immediately. You can also paste or pick an example and press **Analyze**.
4. **Analyze.** `POST /api/analyze` with `{ code }`. Groq returns a JSON object for all six phases plus spoken `explanations`. If the backend is offline, missing a key, or returns incomplete data, `useCompiler` fills gaps from `localAnalyzer.js` and shows an amber fallback banner.
5. **Hear it.** Click a card. `narration.js` prefers the model’s explanations; otherwise it builds prose from tokens, the symbol table, TAC, and assembly. `useSpeech` keeps Chrome from cutting off utterances after ~15 seconds.

### Why the key is on the server

A `VITE_` env var is inlined into the JavaScript bundle at build time, so anyone can read it from DevTools. The Express proxy is the only process that sees `GROQ_API_KEY`. In development Vite forwards `/api` to `http://localhost:5174`. In production the frontend calls the Render URL via `VITE_API_BASE_URL`.

---

## The six phases

| # | Phase | What you see | What the analyser does |
| --- | --- | --- | --- |
| 1 | **Lexical analysis** | Token table | Keywords, identifiers, constants, strings, operators, punctuators, preprocessor directives |
| 2 | **Syntax analysis** | AST + D3 tree | Translation unit → functions → statements → expressions |
| 3 | **Semantic analysis** | Type check + symbol table | Scope-aware names (including function parameters) |
| 4 | **Intermediate code** | Three-address code | Temporaries `t1`, `t2`, …; labels and `goto` / `ifFalse` for `for`, `while`, `if`/`else` |
| 5 | **Optimization** | Before / after TAC | Constant folding, copy propagation, CSE, single-use temp coalescing, dead-code elimination |
| 6 | **Code generation** | Assembly | Simple `LOAD` / `STORE` register machine (`R1`–`R4`) |

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, React Router 7, Tailwind CSS 4 |
| Build | Vite 7 |
| Visualization | D3, react-d3-tree |
| API | Node 20+, Express 4 |
| LLM | Groq (OpenAI-compatible chat completions) |
| Voice | Web Speech API — `SpeechRecognition` in, `speechSynthesis` out |
| Deploy | Netlify (static `dist/`) + Render (`node server/index.js`) |

---

## Project structure

```
.
├── server/
│   ├── index.js              Express: CORS, Groq proxy, three API routes
│   └── prompts.js            Code-generation and six-phase analysis prompts
├── src/
│   ├── App.jsx               Routes, starfield, visualizer page
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── VoiceInput.jsx        Mic, transcript, Generate
│   │   ├── CodeInput.jsx         Editor, examples, Analyze
│   │   ├── PhaseVisualization.jsx Six phase cards + listen / speed
│   │   ├── SpeakButton.jsx       Per-phase listen / stop
│   │   ├── TokenTable.jsx
│   │   ├── ASTVisualization.jsx
│   │   ├── TACDisplay.jsx
│   │   ├── CodeOptimizer.jsx
│   │   ├── AssemblyCode.jsx
│   │   ├── HowItWorks.jsx        Guide at /how-it-works
│   │   └── Footer.jsx
│   ├── hooks/
│   │   ├── useCompiler.js            Generate + analyze pipeline
│   │   ├── useSpeechRecognition.js   Speech → text
│   │   └── useSpeech.js              Text → speech
│   └── services/
│       ├── apiService.js       Browser → backend
│       ├── localAnalyzer.js    Offline C lexer / TAC / optimizer / ASM
│       └── narration.js        Spoken copy for each phase
├── public/favicon/
├── netlify.toml              Frontend build, SPA fallback, security headers
├── render.yaml               Backend web service
├── vite.config.js            Dev proxy /api → localhost:5174
├── .env.sample
├── DEPLOYMENT.md
└── package.json
```

---

## Quick start

**Requirements:** Node 20+ and npm 10+.

```bash
npm install
cp .env.sample .env
# edit .env and set GROQ_API_KEY
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Free Groq keys: [https://console.groq.com/keys](https://console.groq.com/keys).

Without a key the UI still loads. You can paste C (or use examples) and run the **offline analyser**. Voice-to-code generation needs the backend and a key.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Backend and Vite together |
| `npm run client` | Frontend only |
| `npm run server` | Backend only |
| `npm run build` | Production frontend build → `dist/` |
| `npm run preview` | Preview that build |
| `npm start` | Production API (`node server/index.js`) |
| `npm run lint` | ESLint on frontend and backend |

---

## Configuration

`.env` sits at the project root and is read **only by the backend**. It is gitignored.

```ini
GROQ_API_KEY=your_groq_api_key_here
PORT=5174
ALLOWED_ORIGIN=
GROQ_CODEGEN_MODEL=llama-3.3-70b-versatile
GROQ_ANALYSIS_MODEL=llama-3.3-70b-versatile
VITE_API_BASE_URL=
```

| Variable | Who uses it | Notes |
| --- | --- | --- |
| `GROQ_API_KEY` | Server | Required for generation and AI analysis |
| `PORT` | Server | Default `5174`. Must match the Vite proxy target |
| `ALLOWED_ORIGIN` | Server | Comma-separated origins in production (e.g. Netlify URL). Empty = allow all (local dev) |
| `GROQ_CODEGEN_MODEL` | Server | Model for C generation |
| `GROQ_ANALYSIS_MODEL` | Server | Model for phase analysis (JSON mode) |
| `VITE_API_BASE_URL` | Frontend (build time) | Unused locally (proxy). In production: `https://<render-host>/api` |

---

## API

| Method | Route | Body | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `{ status, hasApiKey, codegenModel, analysisModel }` |
| `POST` | `/api/generate-code` | `{ "request": string }` (max 1000 chars) | `{ code, model }` |
| `POST` | `/api/analyze` | `{ "code": string }` (max 8000 chars) | six-phase analysis object |

Analysis payload (shape):

```jsonc
{
  "tokens": [{ "lexeme": "int", "token": "KEYWORD", "attribute": "Type specifier" }],
  "ast": "Translation unit with 1 function definition",
  "treeData": {
    "name": "TranslationUnit",
    "attributes": { "type": "default", "label": "..." },
    "children": []
  },
  "semanticAnalysis": {
    "typeChecking": "...",
    "symbolTable": [{ "name": "n", "type": "int", "scope": "square" }]
  },
  "intermediateCode": ["t1 = n - 1", "..."],
  "optimizedCode": ["..."],
  "assemblyCode": ["LOAD R1, n", "..."],
  "explanations": {
    "lexical": "...",
    "syntax": "...",
    "semantic": "...",
    "intermediate": "...",
    "optimization": "...",
    "codegen": "..."
  }
}
```

Errors: `400` bad body, `503` missing API key, `502` Groq or malformed JSON.

---

## Offline analyser

When the backend is down, has no key, or returns unusable JSON, `src/services/localAnalyzer.js` runs entirely in the browser.

It includes:

- A C lexer (keywords, constants, operators, punctuators; comments stripped)
- Scope-aware symbol tables, including function parameters
- An AST rooted at the translation unit (functions, loops, conditionals)
- Three-address code with labels and jumps for `for`, `while`, and `if`/`else`
- Optimization: constant folding, copy propagation, CSE, temp coalescing, dead-code elimination
- Target code for a simple `LOAD` / `STORE` register machine

You lose AI code generation and richer model explanations. The six phases and narration still run on the local result.

---

## Browser support

| Feature | Chrome | Edge | Safari | Firefox |
| --- | --- | --- | --- | --- |
| Speech recognition (mic) | yes | yes | yes | **no** |
| Speech synthesis (listen) | yes | yes | yes | yes |

Firefox does not implement `SpeechRecognition`. The mic is disabled; type the request instead. Narration works everywhere.

The microphone needs permission and a **secure context**. `localhost` counts as secure.

---

## Deployment

Frontend → **Netlify**. Backend → **Render**. Step-by-step: [DEPLOYMENT.md](./DEPLOYMENT.md).

Short version:

1. Deploy the API on Render (`render.yaml`: `npm install --omit=dev`, `node server/index.js`, health `/api/health`). Set `GROQ_API_KEY`.
2. Deploy the Vite site on Netlify (`netlify.toml`: build `npm run build`, publish `dist`). Set `VITE_API_BASE_URL` to `https://<your-render-service>.onrender.com/api`.
3. Set Render `ALLOWED_ORIGIN` to the exact Netlify URL (no trailing slash).

Render’s free tier sleeps after idle time; the first request after that can take ~30 seconds.

---

## Troubleshooting

**Generate is disabled.** Backend unreachable or no key. Run `npm run server`, put `GROQ_API_KEY` in `.env`, then open [http://localhost:5174/api/health](http://localhost:5174/api/health). You want `"hasApiKey": true`.

**Mic does nothing.** Firefox, or permission denied. Type the request, or use Chrome / Edge / Safari over HTTPS or localhost.

**Narration cuts off after ~15 seconds.** Chrome throttles long utterances. `useSpeech.js` pause/resumes on an interval as a keep-alive. If it still clips, lower the speed slider.

**Amber “built-in offline parser” banner.** AI analysis failed or was skipped. Check the server log for Groq errors (bad key, rate limit, retired model name).

**CORS errors in production.** `ALLOWED_ORIGIN` must match the Netlify origin exactly. Redeploy the API after changing it.

**`VITE_API_BASE_URL` ignored locally.** Expected. Vite proxies `/api` to port 5174. That variable is for the Netlify build.

---

## License

MIT. See [LICENSE](./LICENSE).
