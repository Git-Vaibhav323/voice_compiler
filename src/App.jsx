import { useCallback, useState, useEffect, useRef } from "react";
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
} from "react-icons/fi";
import CodeInput from "./components/CodeInput";
import VoiceInput from "./components/VoiceInput";
import PhaseVisualization from "./components/PhaseVisualization";
import HowItWorks from "./components/HowItWorks";
import Footer from "./components/Footer";
import { useCompiler } from "./hooks/useCompiler";

/* ─────────────────────────────────────────────────────────────────
   Custom cursor — dot + lagging ring, cursor-repel on starfield
   ───────────────────────────────────────────────────────────────── */
function CustomCursor() {
  useEffect(() => {
    const dot  = document.getElementById("cursor-dot");
    const ring = document.getElementById("cursor-ring");
    if (!dot || !ring) return;

    /* Ring position lags behind the dot for a trailing feel */
    let dotX = -100, dotY = -100;
    let ringX = -100, ringY = -100;
    let rafId;

    const lerp = (a, b, t) => a + (b - a) * t;

    const animate = () => {
      ringX = lerp(ringX, dotX, 0.12);
      ringY = lerp(ringY, dotY, 0.12);
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    const onMove = (e) => {
      dotX = e.clientX;
      dotY = e.clientY;
      dot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%,-50%)`;
    };

    const onEnterInteractive = () => document.body.classList.add("cursor-hover");
    const onLeaveInteractive = () => document.body.classList.remove("cursor-hover");

    const onDown = () => {
      document.body.classList.add("cursor-click");
      setTimeout(() => document.body.classList.remove("cursor-click"), 200);
    };

    /* Attach hover state to all interactive elements */
    const INTERACTIVE = "a, button, input, textarea, select, label, [role='button'], [tabindex]";
    const attachHover = () => {
      document.querySelectorAll(INTERACTIVE).forEach((el) => {
        el.addEventListener("mouseenter", onEnterInteractive);
        el.addEventListener("mouseleave", onLeaveInteractive);
      });
    };
    attachHover();

    /* Re-attach when DOM changes (React re-renders) */
    const observer = new MutationObserver(attachHover);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div id="cursor-dot"  aria-hidden="true" />
      <div id="cursor-ring" aria-hidden="true" />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Canvas starfield — stars drift away from cursor (repel effect),
   nebula, twinkling. Static when prefers-reduced-motion is set.
   ───────────────────────────────────────────────────────────────── */
function Starfield() {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  /* Live mouse position shared into the draw loop via a ref (no re-render) */
  const mouseRef  = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    /* Track mouse so the draw loop can read it without triggering re-renders */
    const onMouse = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouse);

    /* ~200 stars — store base position + current offset for repel */
    const stars = Array.from({ length: 200 }, () => ({
      bx: Math.random(),           // base X (0-1 fraction of canvas width)
      by: Math.random(),           // base Y
      ox: 0,                       // current offset X (repel displacement)
      oy: 0,                       // current offset Y
      r:  0.5 + Math.random() * 1.0,
      baseOpacity: 0.15 + Math.random() * 0.55,
      twinkle: Math.random() < 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
    }));

    /* Repel radius and max push distance */
    const REPEL_RADIUS = 120;
    const REPEL_STRENGTH = 28;
    const LERP_BACK = 0.06;   // how fast stars return to base when cursor is gone

    let t = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* ── Nebula ── */
      const addNebula = (cx, cy, rx, ry, r, g, b, a) => {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        grad.addColorStop(0,   `rgba(${r},${g},${b},${a})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${(a * 0.4).toFixed(3)})`);
        grad.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.save();
        ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(
          cx / (rx / Math.max(rx, ry)),
          cy / (ry / Math.max(rx, ry)),
          Math.max(rx, ry), 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      };
      addNebula(W * 0.28, H * 0.22, W * 0.45, H * 0.38, 30,  45, 90, 0.10);
      addNebula(W * 0.68, H * 0.16, W * 0.35, H * 0.28, 90,  70, 45, 0.07);

      /* ── Stars ── */
      const { x: mx, y: my } = mouseRef.current;

      stars.forEach((s) => {
        /* Current real position */
        const baseX = s.bx * W;
        const baseY = s.by * H;

        /* Repel: push away from cursor if within radius */
        const dx = baseX - mx;
        const dy = baseY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetOx = 0;
        let targetOy = 0;

        if (!prefersReduced && dist < REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          targetOx = (dx / dist) * force;
          targetOy = (dy / dist) * force;
        }

        /* Lerp offset toward target (snap to repel, drift back) */
        const lerpRate = dist < REPEL_RADIUS ? 0.18 : LERP_BACK;
        s.ox += (targetOx - s.ox) * lerpRate;
        s.oy += (targetOy - s.oy) * lerpRate;

        const sx = baseX + s.ox;
        const sy = baseY + s.oy;

        let opacity = s.baseOpacity;
        if (!prefersReduced && s.twinkle) {
          opacity = s.baseOpacity * (0.7 + 0.3 * Math.sin(t * s.speed + s.phase));
        }

        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(237,237,237,${opacity.toFixed(3)})`;
        ctx.fill();
      });

      if (!prefersReduced) {
        t += 0.016;
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} id="starfield-canvas" aria-hidden="true" />;
}

/* ─────────────────────────────────────────────────────────────────
   Favicon logo — used in both navs
   ───────────────────────────────────────────────────────────────── */
function FaviconLogo() {
  return (
    <img
      src="/favicon/favicon-32x32.png"
      alt="Voice Compiler logo"
      width={28}
      height={28}
      className="rounded-lg flex-shrink-0"
      style={{ imageRendering: "auto" }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
   Default code
   ───────────────────────────────────────────────────────────────── */
const DEFAULT_CODE = `#include <stdio.h>

int main() {
    int price = 40;
    int rate = 3;
    int total = price + rate * 60;
    printf("%d", total);
    return 0;
}`;

/* ─────────────────────────────────────────────────────────────────
   Main visualizer page
   ───────────────────────────────────────────────────────────────── */
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

  const handleAnalyze = useCallback(
    () => analyzeCode(code),
    [analyzeCode, code]
  );

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
      <Starfield />

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <FaviconLogo />
          <span
            className="font-semibold tracking-tight text-sm hidden sm:block"
            style={{ color: "var(--text-primary)" }}
          >
            Voice Compiler
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/" className="btn-ghost py-2 px-3 text-sm">
            <FiHome className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link to="/how-it-works" className="btn-ghost py-2 px-3 text-sm">
            <FiHelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-20 md:pt-32 md:pb-24">
        <div className="pill-badge mb-8">
          six compiler phases · spoken narration
        </div>

        <h1 className="text-hero mb-5 max-w-2xl">
          Speak a program,
          <br />
          <span className="text-hero-em">watch&nbsp;it&nbsp;compile.</span>
        </h1>

        <p
          className="mb-12 max-w-[52ch]"
          style={{
            color: "var(--text-secondary)",
            fontSize: "1.0625rem",
            lineHeight: 1.55,
          }}
        >
          Say "write a bubble sort in C" — the AI writes it, runs it through
          six compiler phases, and reads every phase aloud.
        </p>

        <div className="w-full max-w-xl">
          <VoiceInput
            onGenerate={handleGenerate}
            generating={generating}
            generationError={generationError}
            backend={backend}
          />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      {!phases && !loading && (
        <section className="relative z-10 px-6 md:px-10 pb-20 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <FiMic className="w-4 h-4" style={{ color: "var(--text-muted)" }} />,
                step: "01",
                title: "Speak a request",
                body: 'Press the mic and say something like "write a bubble sort in C". Chrome, Edge and Safari only — you can also type.',
              },
              {
                icon: <FiCode className="w-4 h-4" style={{ color: "var(--text-muted)" }} />,
                step: "02",
                title: "AI writes the code",
                body: "The backend asks Groq for a clean C program. It drops into the editor and is analysed immediately.",
              },
              {
                icon: <FiCpu className="w-4 h-4" style={{ color: "var(--text-muted)" }} />,
                step: "03",
                title: "Click to hear a phase",
                body: "Six phase cards appear. Click any one and the app reads that phase aloud using your browser's speech synthesis.",
              },
            ].map(({ icon, step, title, body }) => (
              <div
                key={step}
                className="flex flex-col gap-3"
                style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-code text-xs" style={{ color: "var(--text-muted)" }}>
                    {step}
                  </span>
                  {icon}
                </div>
                <h3
                  className="font-semibold text-sm tracking-tight"
                  style={{ color: "var(--text-primary)" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/how-it-works" className="btn-ghost text-sm">
              <FiHelpCircle className="w-3.5 h-3.5" />
              Full guide
              <FiArrowRight className="w-3 h-3 btn-arrow" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Status banners ────────────────────────────────────────── */}
      <div className="relative z-10 px-6 md:px-10 max-w-3xl mx-auto space-y-2.5 mb-4">
        {usingFallback && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(212,165,116,0.07)",
              border: "1px solid rgba(212,165,116,0.18)",
              color: "rgba(212,165,116,0.85)",
            }}
          >
            <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
            Analyzed with the built-in offline parser. Start the backend with an API
            key for richer AI analysis.
          </div>
        )}
        {loading && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(237,237,237,0.04)",
              border: "1px solid var(--border-mid)",
              color: "var(--text-secondary)",
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
            Analyzing your code…
          </div>
        )}
        {error && (
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.18)",
              color: "rgba(252,165,165,0.85)",
            }}
          >
            <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* ── Code input ────────────────────────────────────────────── */}
      <div className="relative z-10 px-6 md:px-10 max-w-3xl mx-auto">
        <CodeInput
          code={code}
          onChange={setCode}
          onAnalyze={handleAnalyze}
          loading={loading}
        />
      </div>

      {/* ── Compilation phases ─────────────────────────────────────── */}
      {phases && (
        <div className="relative z-10 px-6 md:px-10 max-w-3xl mx-auto mt-10 mb-20">
          <div className="flex items-center gap-3 mb-6">
            <FiLayers className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <h2 className="text-title" style={{ color: "var(--text-primary)" }}>
              Compilation Phases
            </h2>
          </div>
          <PhaseVisualization phases={phases} />
        </div>
      )}
    </div>
  );
};

const App = () => (
  <Router>
    <CustomCursor />
    <Routes>
      <Route path="/" element={<CompilerVisualizer />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
    </Routes>
    <Footer />
  </Router>
);

export default App;
