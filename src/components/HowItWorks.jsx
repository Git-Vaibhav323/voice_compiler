import { Link } from "react-router";
import {
  FiArrowLeft,
  FiCode,
  FiCpu,
  FiLayers,
  FiCheckSquare,
  FiZap,
  FiBookOpen,
  FiMic,
  FiVolume2,
  FiServer,
  FiHome,
} from "react-icons/fi";

const PHASES = [
  {
    icon: FiCode,
    title: "Lexical Analysis",
    description: "Breaking source code into tokens — keywords, identifiers, operators, and literals.",
    details: "The scanner reads character streams and groups them into meaningful lexemes.",
  },
  {
    icon: FiLayers,
    title: "Syntax Analysis",
    description: "Parsing tokens into a hierarchical structure — the Abstract Syntax Tree.",
    details: "The parser checks that tokens follow the grammar rules of the language.",
  },
  {
    icon: FiCheckSquare,
    title: "Semantic Analysis",
    description: "Validating meaning and context of the parsed code.",
    details: "Type checking, scope resolution, and ensuring operations are semantically valid.",
  },
  {
    icon: FiCpu,
    title: "Intermediate Code",
    description: "Generating machine-independent three-address code.",
    details: "TAC is easier to optimize and translate than source code or machine code.",
  },
  {
    icon: FiZap,
    title: "Code Optimization",
    description: "Improving intermediate code for better performance.",
    details: "Constant folding, copy propagation, CSE, and dead code elimination.",
  },
  {
    icon: FiCpu,
    title: "Code Generation",
    description: "Producing target machine code from the optimized IR.",
    details: "Translating into assembly instructions for a simple register machine.",
  },
];

const VOICE_STEPS = [
  {
    step: "1",
    title: "Speak your request",
    body: 'Press Speak and say something like "write a bubble sort in C". Your browser transcribes it. You can edit the text afterwards, or skip the mic and type it.',
  },
  {
    step: "2",
    title: "The AI writes the code",
    body: "The backend asks a language model for a short, self-contained C program. The generated code drops into the editor and is analysed straight away.",
  },
  {
    step: "3",
    title: "Listen to each phase",
    body: "Click any phase card, or its Listen button, and the app reads that phase aloud. The narration describes your actual program, not a generic script.",
  },
];

const NOTES = [
  {
    icon: FiMic,
    accentColor: "rgba(212,165,116,0.07)",
    borderColor: "rgba(212,165,116,0.18)",
    textColor: "var(--accent)",
    title: "Browser support",
    body: "Speech recognition needs Chrome, Edge, or Safari. Firefox doesn't implement it, so the mic is disabled there — type your request instead.",
  },
  {
    icon: FiVolume2,
    accentColor: "rgba(94,168,160,0.07)",
    borderColor: "rgba(94,168,160,0.18)",
    textColor: "var(--teal)",
    title: "Reading aloud",
    body: "Speech synthesis works in every current browser. Use the speed slider above the phases to control how fast the narration is spoken.",
  },
  {
    icon: FiServer,
    accentColor: "rgba(237,237,237,0.03)",
    borderColor: "var(--border-mid)",
    textColor: "var(--text-secondary)",
    title: "Offline fallback",
    body: "If the backend is not running or has no API key, a built-in parser analyses your code locally. You lose AI code generation, not the phase visualization.",
  },
];

const HowItWorks = () => (
  <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)" }}>

    {/* Nav */}
    <nav
      className="flex items-center justify-between px-6 md:px-10 py-5"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <Link to="/" className="flex items-center gap-2.5">
        <img
          src="/favicon/favicon-32x32.png"
          alt="Voice Compiler logo"
          width={28}
          height={28}
          className="rounded-lg flex-shrink-0"
        />
        <span className="font-semibold tracking-tight text-sm hidden sm:block" style={{ color: "var(--text-primary)" }}>Voice Compiler</span>
      </Link>
      <Link to="/" className="btn-ghost text-sm py-2 px-3">
        <FiArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </Link>
    </nav>

    <div className="max-w-4xl mx-auto px-6 md:px-10 py-16">

      {/* Page title */}
      <div className="text-center mb-14">
        <div className="pill-badge inline-flex mb-5">
          <FiBookOpen className="w-3 h-3" />
          Guide
        </div>
        <h1 className="text-display mb-4" style={{ color: "#F5F5F7" }}>How Compiler Phases Work</h1>
        <p className="text-base max-w-[52ch] mx-auto" style={{ color: "var(--text-secondary)" }}>
          Understand each step of the compilation process, from source code to executable machine instructions.
        </p>
      </div>

      {/* Phases grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {PHASES.map((phase, i) => {
          const Icon = phase.icon;
          return (
            <div
              key={i}
              className="rounded-2xl p-5 transition-all"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(237,237,237,0.05)", border: "1px solid var(--border-mid)" }}
                >
                  <Icon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                </div>
                <div>
                  <div className="font-code text-xs" style={{ color: "var(--text-muted)" }}>Phase {i + 1}</div>
                  <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{phase.title}</h3>
                </div>
              </div>
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{phase.description}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{phase.details}</p>
            </div>
          );
        })}
      </div>

      {/* Voice workflow */}
      <div
        className="rounded-2xl p-6 md:p-8 mb-10"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(237,237,237,0.05)", border: "1px solid var(--border-mid)" }}
          >
            <FiMic className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </div>
          <h2 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>Using Your Voice</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {VOICE_STEPS.map(({ step, title, body }) => (
            <div key={step} style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="font-code text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(237,237,237,0.05)", border: "1px solid var(--border-mid)", color: "var(--text-muted)" }}
                >
                  {step}
                </span>
                <h4 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h4>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{body}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {NOTES.map(({ icon: Icon, accentColor, borderColor, textColor, title, body }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ background: accentColor, border: `1px solid ${borderColor}`, color: "var(--text-secondary)" }}
            >
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: textColor }} />
              <p>
                <span className="font-semibold" style={{ color: textColor }}>{title}: </span>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div
        className="rounded-2xl p-6 md:p-8 mb-10"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(237,237,237,0.05)", border: "1px solid var(--border-mid)" }}
          >
            <FiBookOpen className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </div>
          <h2 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>About This Tool</h2>
        </div>
        <div className="space-y-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p>
            This Voice Compiler Visualizer helps students and developers understand how source code
            is transformed through the stages of compilation. You describe a program out loud, an AI
            writes the C code, and the app walks you through every phase both visually and audibly.
          </p>
          <p>
            The analysis covers tokenization, parsing into an abstract syntax tree, semantic checking
            with a scope-aware symbol table, three-address code with explicit control flow, optimization
            passes such as constant folding and common subexpression elimination, and finally target
            code for a simple register machine.
          </p>
        </div>
      </div>

      <div className="text-center">
        <Link to="/" className="btn-primary">
          <FiHome className="w-4 h-4" />
          Try the Visualizer
        </Link>
      </div>
    </div>
  </div>
);

export default HowItWorks;
