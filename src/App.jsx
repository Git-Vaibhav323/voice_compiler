import { useCallback, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router";
import {
  FiCode,
  FiCpu,
  FiLayers,
  FiAlertTriangle,
  FiMic,
  FiHome,
  FiHelpCircle,
  FiArrowRight,
  FiZap,
} from "react-icons/fi";
import CodeInput from "./components/CodeInput";
import VoiceInput from "./components/VoiceInput";
import PhaseVisualization from "./components/PhaseVisualization";
import HowItWorks from "./components/HowItWorks";
import Footer from "./components/Footer";
import { useCompiler } from "./hooks/useCompiler";

const DEFAULT_CODE = `#include <stdio.h>

int main() {
    int price = 40;
    int rate = 3;
    int total = price + rate * 60;
    printf("%d", total);
    return 0;
}`;

const CompilerVisualizer = () => {
  const [code, setCode] = useState(DEFAULT_CODE);

  const {
    phases,
    loading,
    error,
    usingFallback,
    analyzeCode,
    generating,
    generationError,
    generateCode,
    backend,
  } = useCompiler();

  const handleAnalyze = useCallback(() => analyzeCode(code), [analyzeCode, code]);

  const handleGenerate = useCallback(
    async (request) => {
      const generated = await generateCode(request);
      if (!generated) return;
      setCode(generated);
      await analyzeCode(generated);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [generateCode, analyzeCode]
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>

      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center accent-bg shadow-lg shadow-indigo-500/25">
            <FiMic className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight text-base hidden sm:block">
            Voice Compiler
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="btn-ghost py-2 px-3 text-sm"
          >
            <FiHome className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link
            to="/how-it-works"
            className="btn-ghost py-2 px-3 text-sm"
          >
            <FiHelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Guide</span>
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="pill-badge mb-6">
          <FiZap className="w-3 h-3" />
          AI-powered · six phases · spoken narration
        </div>

        <h1 className="text-hero text-white mb-4 max-w-3xl">
          Speak a program,<br />
          <span className="gradient-text">watch it compile.</span>
        </h1>

        <p className="text-base md:text-lg max-w-xl mb-10" style={{ color: "var(--text-secondary)" }}>
          Say "write a bubble sort in C" — the AI writes it, runs it through
          six compiler phases, and reads every phase aloud.
        </p>

        {/* Voice input is the hero focal element */}
        <div className="w-full max-w-2xl">
          <VoiceInput
            onGenerate={handleGenerate}
            generating={generating}
            generationError={generationError}
            backend={backend}
          />
        </div>
      </section>

      {/* ── How it works — 3 columns below the fold ─────────────────── */}
      {!phases && !loading && (
        <section className="relative z-10 px-6 md:px-10 pb-16 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <FiMic className="w-5 h-5" style={{ color: "var(--accent-from)" }} />,
                step: "01",
                title: "Speak a request",
                body: 'Press the mic and say something like "write a bubble sort in C". Chrome, Edge and Safari only for voice — you can also type.',
              },
              {
                icon: <FiCode className="w-5 h-5" style={{ color: "var(--accent-from)" }} />,
                step: "02",
                title: "AI writes the code",
                body: "The backend asks Groq to generate a clean, commented C program. The code drops into the editor instantly.",
              },
              {
                icon: <FiCpu className="w-5 h-5" style={{ color: "var(--accent-from)" }} />,
                step: "03",
                title: "Click to hear a phase",
                body: "Six phase cards appear. Click any one — or its Listen button — and the app reads that phase aloud using your browser's speech synthesis.",
              },
            ].map(({ icon, step, title, body }) => (
              <div key={step} className="flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
                <div className="flex items-center gap-3">
                  <span className="font-code text-xs" style={{ color: "var(--text-muted)" }}>{step}</span>
                  {icon}
                </div>
                <h3 className="font-semibold text-white text-base">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/how-it-works"
              className="btn-ghost text-sm"
            >
              <FiHelpCircle className="w-4 h-4" />
              Full guide
              <FiArrowRight className="w-3 h-3 btn-arrow" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Status banners ──────────────────────────────────────────── */}
      <div className="relative z-10 px-6 md:px-10 max-w-4xl mx-auto space-y-3 mb-4">
        {usingFallback && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", color: "rgba(253,224,71,0.85)" }}>
            <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
            Analyzed with the built-in offline parser. Start the backend with an API key for richer AI analysis.
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin flex-shrink-0" />
            Analyzing your code…
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(252,165,165,0.9)" }}>
            <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* ── Code input ──────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 md:px-10 max-w-4xl mx-auto">
        <CodeInput
          code={code}
          onChange={setCode}
          onAnalyze={handleAnalyze}
          loading={loading}
        />
      </div>

      {/* ── Compilation phases ───────────────────────────────────────── */}
      {phases && (
        <div className="relative z-10 px-6 md:px-10 max-w-4xl mx-auto mt-8 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <FiLayers className="w-5 h-5" style={{ color: "var(--accent-from)" }} />
            <h2 className="text-title text-white">Compilation Phases</h2>
          </div>
          <PhaseVisualization phases={phases} />
        </div>
      )}
    </div>
  );
};

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<CompilerVisualizer />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
    </Routes>
    <Footer />
  </Router>
);

export default App;
