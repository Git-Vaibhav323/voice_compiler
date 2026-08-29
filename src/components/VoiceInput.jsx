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
  const hasText = request.trim().length > 0;

  return (
    <div
      className="w-full rounded-2xl p-6 md:p-8"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      {/* ── Backend warning ────────────────────────────────────────── */}
      {!backendReady && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6 text-sm"
          style={{
            background: "rgba(212,165,116,0.07)",
            border: "1px solid rgba(212,165,116,0.18)",
            color: "rgba(212,165,116,0.82)",
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

      {/* ── Core: mic + input + generate ─────────────────────────── */}
      <div className="flex items-center gap-5 md:gap-6">

        {/* Mic — the single focal element */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          {/* Pulse rings — teal when recording */}
          {listening && (
            <>
              <span
                className="mic-ring-1 absolute rounded-full"
                style={{ width: 72, height: 72, background: "var(--teal-dim)" }}
              />
              <span
                className="mic-ring-2 absolute rounded-full"
                style={{ width: 72, height: 72, background: "var(--teal-glow)" }}
              />
              <span
                className="mic-ring-3 absolute rounded-full"
                style={{ width: 72, height: 72, background: "rgba(94,168,160,0.05)" }}
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
            className="relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
            style={
              listening
                ? {
                    background: "var(--teal)",
                    border: "none",
                    boxShadow: "0 0 0 1px rgba(94,168,160,0.4), 0 4px 24px rgba(94,168,160,0.28)",
                  }
                : {
                    background: "rgba(237,237,237,0.04)",
                    border: "1px solid var(--border-mid)",
                    boxShadow: "none",
                  }
            }
          >
            {listening
              ? <FiMicOff className="w-6 h-6" style={{ color: "#0A0A0B" }} />
              : <FiMic className="w-6 h-6" style={{ color: "var(--text-secondary)" }} />
            }
          </button>
        </div>

        {/* Right side: input + generate */}
        <div className="flex-1 min-w-0">
          {/* Input — borderless box, hairline bottom rule */}
          <div className="relative">
            <input
              type="text"
              value={listening && interim ? `${request} ${interim}`.trim() : request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder={
                supported
                  ? "Tap the mic, or type your request…"
                  : "Type your request here…"
              }
              className="w-full py-3 pr-8 outline-none bg-transparent text-base"
              style={{
                borderBottom: listening
                  ? "1px solid var(--teal)"
                  : "1px solid var(--border-mid)",
                color: "var(--text-primary)",
                caretColor: "var(--accent)",
                transition: "border-color 0.2s ease",
              }}
            />
            {request && (
              <button
                onClick={handleClear}
                title="Clear"
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Generate — dimmed until text is present */}
          <div className="flex justify-end mt-4">
            {hasText && backendReady ? (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary"
              >
                {generating
                  ? <FiLoader className="w-3.5 h-3.5 animate-spin" />
                  : <FiArrowRight className="w-3.5 h-3.5 btn-arrow" />
                }
                {generating ? "Writing…" : "Generate"}
              </button>
            ) : (
              <span className="btn-primary-dim">
                <FiArrowRight className="w-3.5 h-3.5" />
                Generate
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Live transcript indicator ─────────────────────────────── */}
      {listening && (
        <div
          className="flex items-center gap-3 mt-5 text-sm"
          style={{ color: "var(--teal)" }}
        >
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "var(--teal)" }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--teal)" }}
            />
          </span>
          {interim ? `Hearing: ${interim}` : "Listening — start speaking…"}
        </div>
      )}

      {/* ── Errors ───────────────────────────────────────────────── */}
      {(speechError || generationError) && (
        <div
          className="flex items-start gap-3 mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.16)",
            color: "rgba(252,165,165,0.85)",
          }}
        >
          <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{speechError || generationError}</p>
        </div>
      )}

      {!supported && (
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Voice input needs Chrome, Edge, or Safari.
        </p>
      )}

      {/* ── Suggestion chips ──────────────────────────────────────── */}
      <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs mb-2.5" style={{ color: "var(--text-muted)" }}>
          Try saying:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setRequest(s)}
              className="text-xs px-3 py-1.5 rounded-full cursor-pointer transition-all"
              style={{
                background: "rgba(237,237,237,0.04)",
                border: "1px solid var(--border-mid)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(237,237,237,0.18)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-mid)";
                e.currentTarget.style.color = "var(--text-muted)";
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
