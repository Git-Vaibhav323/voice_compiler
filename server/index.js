import "dotenv/config";
import express from "express";
import cors from "cors";
import { buildCodeGenPrompt, buildAnalysisPrompt } from "./prompts.js";

const app = express();
const PORT = process.env.PORT || 5174;

const GROQ_API_KEY    = process.env.GROQ_API_KEY;
const GROQ_API_URL    = "https://api.groq.com/openai/v1/chat/completions";
const CODEGEN_MODEL   = process.env.GROQ_CODEGEN_MODEL  || "llama-3.3-70b-versatile";
const ANALYSIS_MODEL  = process.env.GROQ_ANALYSIS_MODEL || "llama-3.3-70b-versatile";

/* ------------------------------------------------------------------ *
 * CORS
 *
 * ALLOWED_ORIGIN is set in the Render dashboard to your Netlify URL,
 * e.g. https://your-app.netlify.app
 * In local dev it falls back to permissive so both the Vite proxy and
 * direct curl calls work without any extra config.
 * ------------------------------------------------------------------ */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

const corsOptions = ALLOWED_ORIGIN
  ? {
      origin: (origin, cb) => {
        // Allow the configured origin plus same-origin (no Origin header)
        if (!origin || origin === ALLOWED_ORIGIN) {
          cb(null, true);
        } else {
          cb(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }
  : {}; // open in dev — Vite proxy is the gatekeeper locally

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // pre-flight for all routes
app.use(express.json({ limit: "256kb" }));

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function keyMissing(res) {
  if (!GROQ_API_KEY) {
    res.status(503).json({
      error:
        "GROQ_API_KEY is not set on the server. Copy .env.sample to .env and add your key.",
    });
    return true;
  }
  return false;
}

async function callGroq({ model, prompt, jsonMode = false, maxTokens = 4000 }) {
  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Groq API responded ${response.status}: ${detail.slice(0, 400)}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq API returned an empty response");
  }

  return content;
}

/** Models sometimes wrap code in markdown fences despite instructions. */
function stripCodeFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:[a-zA-Z]*)?\s*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(GROQ_API_KEY),
    codegenModel: CODEGEN_MODEL,
    analysisModel: ANALYSIS_MODEL,
  });
});

/**
 * POST /api/generate-code
 * Body: { request: "write a bubble sort in C" }
 * Returns: { code: "#include <stdio.h> ..." }
 */
app.post("/api/generate-code", async (req, res) => {
  if (keyMissing(res)) return;

  const request = (req.body?.request || "").trim();

  if (!request) {
    return res.status(400).json({ error: "Missing 'request' in request body" });
  }

  if (request.length > 1000) {
    return res
      .status(400)
      .json({ error: "Request is too long (max 1000 characters)" });
  }

  try {
    const raw = await callGroq({
      model: CODEGEN_MODEL,
      prompt: buildCodeGenPrompt(request),
      maxTokens: 1500,
    });

    res.json({ code: stripCodeFences(raw), model: CODEGEN_MODEL });
  } catch (err) {
    console.error("[generate-code]", err.message);
    res.status(502).json({ error: err.message });
  }
});

/**
 * POST /api/analyze
 * Body: { code: "int main() { ... }" }
 * Returns the six-phase analysis object.
 */
app.post("/api/analyze", async (req, res) => {
  if (keyMissing(res)) return;

  const code = (req.body?.code || "").trim();

  if (!code) {
    return res.status(400).json({ error: "Missing 'code' in request body" });
  }

  if (code.length > 8000) {
    return res
      .status(400)
      .json({ error: "Code is too long for analysis (max 8000 characters)" });
  }

  try {
    const raw = await callGroq({
      model: ANALYSIS_MODEL,
      prompt: buildAnalysisPrompt(code),
      jsonMode: true,
      maxTokens: 6000,
    });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res
        .status(502)
        .json({ error: "Model returned malformed JSON for the analysis" });
    }

    res.json(parsed);
  } catch (err) {
    console.error("[analyze]", err.message);
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Compiler Visualizer API listening on http://localhost:${PORT}`);
  if (!GROQ_API_KEY) {
    console.warn(
      "WARNING: GROQ_API_KEY is not set. Copy .env.sample to .env and add your key."
    );
  }
});
