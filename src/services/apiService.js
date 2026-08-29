/**
 * Frontend API layer.
 *
 * The Groq key now lives on the server, so the browser never sees it. Every
 * call goes to our own Express proxy. If the proxy is down or has no key, the
 * caller falls back to the offline analyzer in localAnalyzer.js.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

/** Is the backend up, and does it have a key? */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) return { online: false, hasApiKey: false };

    const data = await response.json();
    return { online: true, hasApiKey: Boolean(data.hasApiKey) };
  } catch {
    return { online: false, hasApiKey: false };
  }
}

/**
 * Turn a plain-language request ("write a bubble sort in C") into C source.
 */
export async function generateCodeFromRequest(request) {
  const data = await postJson("/generate-code", { request });

  if (!data.code || !data.code.trim()) {
    throw new Error("The model returned no code. Try rephrasing your request.");
  }

  return data.code;
}

/**
 * Run C source through all six compiler phases.
 */
export async function analyzeCodeWithAI(code) {
  return postJson("/analyze", { code });
}
