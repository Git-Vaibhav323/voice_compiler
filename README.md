# Voice Compiler Visualizer

Describe a program out loud, get C code written for you by an AI, and then
watch **and hear** it travel through all six phases of compilation.

Built on top of the original Compiler Visualizer, extended with:

- **Voice input** — say "write a bubble sort in C" instead of typing it
- **AI code generation** — a language model turns that request into C source
- **Spoken phase explanations** — click any phase to have it read aloud
- **A secure backend** — the API key lives on the server, never in the browser
- **Whole-program analysis** — full C programs, not just single expressions

---

## How it works

```
  speak  ──►  transcribe  ──►  AI writes C  ──►  six-phase analysis  ──►  narrate
 (mic)      Web Speech API      Express +          Express + Groq        speechSynthesis
                                  Groq            (local fallback)
```

1. You press **Speak** and describe a program. The browser transcribes it with
   the Web Speech API.
2. The request goes to the Express backend, which asks Groq for a short,
   self-contained C program and returns the source.
3. The generated code lands in the editor and is analysed immediately, again
   through the backend.
4. Each phase renders as a card. Click a card, or its **Listen** button, and
   the app speaks an explanation of what happened in *your* program.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure your key
cp .env.sample .env
#    then edit .env and paste your Groq key

# 3. Run backend and frontend together
npm run dev
```

Open http://localhost:5173.

Get a free Groq API key at https://console.groq.com/keys.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the backend and the Vite dev server together |
| `npm run client` | Frontend only |
| `npm run server` | Backend only |
| `npm run build` | Production build of the frontend |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint across frontend and backend |

---

## Configuration

`.env` lives at the project root and is read **only by the backend**. It is
gitignored and never bundled into the browser.

```ini
GROQ_API_KEY=your_groq_api_key_here
PORT=5174
GROQ_CODEGEN_MODEL=llama-3.3-70b-versatile
GROQ_ANALYSIS_MODEL=llama-3.3-70b-versatile
```

If you change `PORT`, update the proxy target in `vite.config.js` to match.

### Why a backend?

The original version read the key with `import.meta.env.VITE_GROQ_API_KEY`.
Anything prefixed `VITE_` is inlined into the JavaScript bundle at build time,
so the key was visible to anyone who opened DevTools. Moving it behind an
Express proxy keeps it on the server. The browser only ever talks to `/api`.

---

## API

The backend exposes three routes.

| Method | Route | Body | Returns |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `{ status, hasApiKey, codegenModel, analysisModel }` |
| `POST` | `/api/generate-code` | `{ request: string }` | `{ code: string }` |
| `POST` | `/api/analyze` | `{ code: string }` | the six-phase analysis object |

The analysis object looks like this:

```jsonc
{
  "tokens": [{ "lexeme": "int", "token": "KEYWORD", "attribute": "Type specifier" }],
  "ast": "Translation unit with 1 function definition",
  "treeData": { "name": "TranslationUnit", "attributes": {}, "children": [] },
  "semanticAnalysis": { "typeChecking": "...", "symbolTable": [] },
  "intermediateCode": ["t1 = n - 1", "..."],
  "optimizedCode": ["..."],
  "assemblyCode": ["LOAD R1, n", "..."],
  "explanations": { "lexical": "...", "syntax": "..." }  // used for narration
}
```

---

## Browser support

| Feature | Chrome | Edge | Safari | Firefox |
| --- | --- | --- | --- | --- |
| Speech recognition (mic) | yes | yes | yes | **no** |
| Speech synthesis (listen) | yes | yes | yes | yes |

Firefox does not implement `SpeechRecognition`, so the mic button is disabled
there and you type your request instead. Everything else works. Reading phases
aloud works everywhere.

The mic needs microphone permission and, in most browsers, a secure context —
`localhost` counts as secure, so local development is fine.

---

## Offline fallback

If the backend is down or has no API key, the app falls back to
`src/services/localAnalyzer.js`, a heuristic C analyser that runs entirely in
the browser. You lose AI code generation, but the six phases still work and the
narration is still generated from the real analysis.

The local analyser handles:

- A proper C lexer with keyword, constant, operator and punctuator classes
- Scope-aware symbol tables, including function parameters
- An AST rooted at the translation unit, with functions, loops and conditionals
- Three-address code with labels and gotos for `for`, `while` and `if`/`else`
- Optimization: constant folding, copy propagation, common subexpression
  elimination, single-use temporary coalescing, dead code elimination
- Target code for a simple LOAD/STORE register machine

It is a teaching tool, not a real front end. Pointers, structs and
preprocessor macros are recognised but not deeply analysed.

---

## Project structure

```
server/
  index.js            Express proxy, holds the API key
  prompts.js          Prompt templates for code generation and analysis
src/
  components/
    VoiceInput.jsx        Mic button, transcript, generate
    SpeakButton.jsx       Per-phase listen/stop control
    PhaseVisualization.jsx Six phase cards, click to hear
    CodeInput.jsx         Editor with C examples
    TokenTable.jsx, ASTVisualization.jsx, TACDisplay.jsx,
    CodeOptimizer.jsx, AssemblyCode.jsx, HowItWorks.jsx, Footer.jsx
  hooks/
    useSpeechRecognition.js  Speech to text
    useSpeech.js             Text to speech
    useCompiler.js           Generation + analysis pipeline
  services/
    apiService.js       Talks to the backend
    localAnalyzer.js    Offline C analyser
    narration.js        Builds the spoken text for each phase
```

---

## Troubleshooting

**The Generate button is disabled.** The backend is unreachable or has no key.
Check `npm run server` is running and that `.env` contains `GROQ_API_KEY`.
Visit http://localhost:5174/api/health to confirm.

**The mic button does nothing.** You are probably in Firefox. Type the request
instead, or switch to Chrome, Edge or Safari.

**Narration cuts off after ~15 seconds.** Chrome throttles long utterances.
There is a keep-alive in `useSpeech.js` that works around this; if you still
see it, lower the speed slider so utterances are shorter.

**"Using the built-in offline parser" keeps appearing.** The backend analysis
failed. Check the server console for the error from Groq — usually an invalid
key, a rate limit, or a model name that no longer exists.

---

## License

See `LICENSE`. Original project by
[danielace1](https://github.com/danielace1/compiler-visualizer).
