import { useEffect, useState } from "react";
import {
  FiMic,
  FiMicOff,
  FiArrowRight,
  FiAlertCircle,
  FiLoader,
  FiX,
} from "react-icons/fi";
import useSpeechRecognition from "../hooks/useSpeechRecognition";

const SUGGESTIONS = [
  "Write a bubble sort in C",
  "Check if a number is prime",
  "Find the factorial of a number",
  "Linear search in C",
  "Reverse an array",
];

const VoiceInput = ({ onGenerate, generating, generationError, backend }) => {
  const [request, setRequest] = useState("");

  const {
    supported,
    listening,
    transcript,
    interim,
    error: speechError,
    toggle,
    reset,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setRequest(transcript);
  }, [transcript]);

  const handleGenerate = () => {
    const text = request.trim();
    if (!text || generating) return;
    onGenerate(text);
  };

  const handleClear = () => {
    setRequest("");
    reset();
  };

  const backendReady = backend.online && backend.hasApiKey;

  return (
    <div
      className="rounded-2xl p-6 md:p-8 w-full"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      {/* ── Backend warning ─────────────────────────────────────────── */}
      {!backendReady && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{
            background: "rgba(234,179,8,0.07)",
            border: "1px solid rgba(234,179,8,0.2)",
            color: "rgba(253,224,71,0.8)",
          }}
        >
          <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            {!backend.online
              ? "Backend not reachable — run npm run server, then reload."
              : "No GROQ_API_KEY set. Add one to .env to enable code generation."}
          </p>
        </div>
      )}

      {/* ── Main input row ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">

        {/* Mic button — hero interaction */}
        <div className="flex justify-center sm:justify-start">
          <div className="relative flex items-center justify-center">
            {/* Pulse rings */}
            {listening && (
              <>
                <span
                  className="mic-ring-1 absolute rounded-full"
                  style={{
                    width: 64, height: 64,
                    background: "rgba(99,102,241,0.3)",
                  }}
                />
                <span
                  className="mic-ring-2 absolute rounded-full"
                  style={{
                    width: 64, height: 64,
                    background: "rgba(168,85,247,0.2)",
                  }}
                />
                <span
                  className="mic-ring-3 absolute rounded-full"
                  style={{
                    width: 64, height: 64,
                    background: "rgba(99,102,241,0.12)",
                  }}
                />
              </>
            )}
            <button
              onClick={toggle}
              disabled={!supported}
              title={
                supported
                  ? listening ? "Stop listening" : "Start listening"
                  : "Voice input not supported in this browser"
              }
              aria-label={listening ? "Stop voice recording" : "Start voice recording"}
              className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
              style={{
                background: listening
                  ? "linear-gradient(135deg, #6366F1, #A855F7)"
                  : "rgba(99,102,241,0.12)",
                border: listening
                  ? "none"
                  : "1px solid rgba(99,102,241,0.3)",
                boxShadow: listening
                  ? "0 0 32px rgba(99,102,241,0.45)"
                  : "none",
              }}
            >
              {listening
                ? <FiMicOff className="w-6 h-6 text-white" />
                : <FiMic className="w-6 h-6" style={{ color: "#a5b4fc" }} />
              }
            </button>
          </div>
        </div>

        {/* Text field + generate */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={listening && interim ? `${request} ${interim}`.trim() : request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder={
                supported
                  ? "Tap the mic and speak, or type your request…"
                  : "Type your request here (voice not supported in this browser)"
              }
              className="w-full py-4 pl-5 pr-12 rounded-xl text-sm md:text-base outline-none transition-all"
              style={{
                backgroundColor: "var(--bg-raised)",
                border: listening
                  ? "1px solid rgba(99,102,241,0.5)"
                  : "1px solid var(--border-mid)",
                color: "var(--text-primary)",
                caretColor: "#a5b4fc",
              }}
            />
            {request && (
              <button
                onClick={handleClear}
                title="Clear"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !request.trim() || !backendReady}
            className="btn-primary self-end"
          >
            {generating ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : (
              <FiArrowRight className="w-4 h-4 btn-arrow" />
            )}
            {generating ? "Writing…" : "Generate"}
          </button>
        </div>
      </div>

      {/* ── Live transcript feedback ──────────────────────────────────── */}
      {listening && (
        <div
          className="flex items-center gap-3 mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#a5b4fc",
          }}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          {interim ? `Hearing: ${interim}` : "Listening — start speaking…"}
        </div>
      )}

      {/* ── Errors ───────────────────────────────────────────────────── */}
      {(speechError || generationError) && (
        <div
          className="flex items-start gap-3 mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "rgba(252,165,165,0.9)",
          }}
        >
          <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{speechError || generationError}</p>
        </div>
      )}

      {!supported && (
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Voice input needs the Web Speech API — available in Chrome, Edge and Safari.
        </p>
      )}

      {/* ── Suggestion chips ─────────────────────────────────────────── */}
      <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Try saying:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setRequest(s)}
              className="text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer"
              style={{
                background: "rgba(99,102,241,0.07)",
                border: "1px solid rgba(99,102,241,0.2)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.15)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(99,102,241,0.07)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceInput;
