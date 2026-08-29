import TokenTable from "./TokenTable";
import ASTVisualization from "./ASTVisualization";
import TACDisplay from "./TACDisplay";
import CodeOptimizer from "./CodeOptimizer";
import AssemblyCode from "./AssemblyCode";
import SpeakButton from "./SpeakButton";
import { getPhaseNarration } from "../services/narration";
import { useSpeech } from "../hooks/useSpeech";
import {
  FiCode,
  FiDatabase,
  FiInfo,
  FiZap,
  FiCpu,
  FiCheckCircle,
  FiVolumeX,
} from "react-icons/fi";

/* ─── Waveform indicator shown on the active/speaking card ─────────── */
const Waveform = () => (
  <div className="flex items-end gap-0.5 h-5" aria-hidden="true">
    {[
      "wave-bar-1", "wave-bar-2", "wave-bar-3", "wave-bar-4", "wave-bar-5",
    ].map((cls) => (
      <span
        key={cls}
        className={`inline-block w-0.5 rounded-full ${cls}`}
        style={{ background: "var(--accent)", minHeight: 3 }}
      />
    ))}
  </div>
);

export default function PhaseVisualization({ phases }) {
  const { speak, stop, speaking, activeId, supported, rate, setRate } =
    useSpeech();

  if (!phases) return null;

  /* Derive assembly from optimised TAC when the analysis didn't supply any. */
  if (
    !phases.assemblyCode ||
    !Array.isArray(phases.assemblyCode) ||
    phases.assemblyCode.length === 0
  ) {
    const assemblyCode = [];
    if (phases.optimizedCode?.length) {
      phases.optimizedCode.forEach((line) => {
        if (!line.includes("=")) return;
        const [leftSide, rightSide] = line.split("=").map((p) => p.trim());
        const binary = ["+", "-", "*", "/"].find((op) =>
          rightSide.includes(op)
        );
        if (binary) {
          const mnemonic = { "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV" }[binary];
          const [a, b] = rightSide.split(binary).map((p) => p.trim());
          assemblyCode.push(`LOAD R1, ${a}`);
          assemblyCode.push(`${mnemonic} R1, ${b}`);
          assemblyCode.push(`STORE ${leftSide}, R1`);
        } else {
          assemblyCode.push(`LOAD R1, ${rightSide}`);
          assemblyCode.push(`STORE ${leftSide}, R1`);
        }
      });
      phases.assemblyCode = assemblyCode;
    }
  }

  const handleSpeak = (phaseKey) => {
    speak(getPhaseNarration(phaseKey, phases), phaseKey);
  };

  /* ── Phase card ──────────────────────────────────────────────────── */
  const PhaseCard = ({ phaseKey, number, title, icon: Icon, children }) => {
    const isActive = activeId === phaseKey && speaking;

    const handleCardClick = (event) => {
      const interactive = event.target.closest(
        "button, a, input, textarea, select, svg, canvas, [role='button']"
      );
      if (interactive) return;
      handleSpeak(phaseKey);
    };

    return (
      <section
        onClick={handleCardClick}
        className={`phase-card p-5 md:p-6${isActive ? " active" : ""}`}
        aria-label={`${title} phase`}
      >
        {/* Card header */}
        <div className="flex items-center gap-3 mb-5">
          {/* Number badge */}
          <span
            className="font-code text-xs flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(237,237,237,0.05)",
              border: "1px solid var(--border-mid)",
              color: "var(--text-muted)",
            }}
          >
            {number}
          </span>

          <h2
            className="font-semibold text-base md:text-lg flex-1 tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h2>

          {/* Waveform or icon */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isActive ? (
              <Waveform />
            ) : (
              Icon && (
                <Icon
                  className="w-4 h-4 hidden sm:block"
                  style={{ color: "var(--text-muted)" }}
                />
              )
            )}

            <SpeakButton
              active={activeId === phaseKey}
              speaking={speaking}
              supported={supported}
              onClick={() => handleSpeak(phaseKey)}
              label={title}
            />
          </div>
        </div>

        {/* Card content */}
        <div>{children}</div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Narration controls ───────────────────────────────────────── */}
      {supported ? (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl px-5 py-3"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>
            Click any phase card to hear it explained — or use its Listen button.
          </p>

          <div className="flex items-center gap-3">
            <label
              htmlFor="speech-rate"
              className="text-xs flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              Speed
            </label>
            <input
              id="speech-rate"
              type="range"
              min="0.6"
              max="1.6"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-24 cursor-pointer"
            />
            <span
              className="font-code text-xs w-8"
              style={{ color: "var(--text-muted)" }}
            >
              {rate.toFixed(1)}×
            </span>

            {speaking && (
              <button
                onClick={stop}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "rgba(252,165,165,0.9)",
                }}
              >
                Stop
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(234,179,8,0.07)",
            border: "1px solid rgba(234,179,8,0.2)",
            color: "rgba(253,224,71,0.8)",
          }}
        >
          <FiVolumeX className="w-4 h-4 flex-shrink-0" />
          This browser does not support speech synthesis — phases cannot be read aloud.
        </div>
      )}

      {/* ── Phase 1 — Lexical ─────────────────────────────────────────── */}
      <PhaseCard phaseKey="lexical" number="1" title="Lexical Analysis" icon={FiCode}>
        <TokenTable tokens={phases.tokens} />
      </PhaseCard>

      {/* ── Phase 2 — Syntax ──────────────────────────────────────────── */}
      <PhaseCard phaseKey="syntax" number="2" title="Syntax Analysis" icon={FiCode}>
        <ASTVisualization astTree={phases.treeData} astString={phases.ast} />
      </PhaseCard>

      {/* ── Phase 3 — Semantic ────────────────────────────────────────── */}
      <PhaseCard phaseKey="semantic" number="3" title="Semantic Analysis" icon={FiDatabase}>
        {/* Type checking */}
        <div className="mb-5">
          <h3
            className="text-sm font-medium mb-2 flex items-center gap-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <FiCheckCircle className="w-4 h-4" style={{ color: "#4ade80" }} />
            Type Checking
          </h3>
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(74,222,128,0.05)",
              border: "1px solid rgba(74,222,128,0.15)",
              color: "rgba(134,239,172,0.9)",
            }}
          >
            {phases.semanticAnalysis?.typeChecking === "success"
              ? "All expressions are well-typed. No type errors detected."
              : phases.semanticAnalysis?.typeChecking ||
                "No type checking information available."}
          </div>
        </div>

        {/* Symbol table */}
        <div>
          <h3
            className="text-sm font-medium mb-2 flex items-center gap-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <FiDatabase className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            Symbol Table
          </h3>
          <div className="overflow-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <table className="min-w-full">
              <thead>
                <tr style={{ backgroundColor: "rgba(237,237,237,0.03)", borderBottom: "1px solid var(--border)" }}>
                  {["Name", "Type", "Scope"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-code text-xs tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phases.semanticAnalysis?.symbolTable?.map((sym, i) => (
                  <tr
                    key={`${sym.name}-${sym.scope}-${i}`}
                    style={{
                      backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <td className="px-4 py-3 font-code text-sm" style={{ color: "var(--text-primary)" }}>
                      {sym.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-code text-xs px-2.5 py-0.5 rounded-full"
                        style={{
                          background: "rgba(212,165,116,0.10)",
                          border: "1px solid rgba(212,165,116,0.22)",
                          color: "var(--accent)",
                        }}
                      >
                        {sym.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {sym.scope}
                    </td>
                  </tr>
                ))}
                {!phases.semanticAnalysis?.symbolTable?.length && (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-4 py-6 text-sm text-center"
                      style={{ color: "var(--text-muted)" }}
                    >
                      No symbol table information available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div
            className="mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-xs"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <FiInfo className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            The symbol table stores each identifier with its type and scope. Function
            parameters and local variables are recorded against their enclosing function.
          </div>
        </div>
      </PhaseCard>

      {/* ── Phase 4 — Intermediate ────────────────────────────────────── */}
      <PhaseCard phaseKey="intermediate" number="4" title="Intermediate Code Generation" icon={FiCode}>
        <TACDisplay code={phases.intermediateCode} />
      </PhaseCard>

      {/* ── Phase 5 — Optimization ────────────────────────────────────── */}
      <PhaseCard phaseKey="optimization" number="5" title="Code Optimization" icon={FiZap}>
        <CodeOptimizer
          intermediateCode={phases.intermediateCode}
          optimizedCode={phases.optimizedCode}
        />
      </PhaseCard>

      {/* ── Phase 6 — Code Generation ─────────────────────────────────── */}
      <PhaseCard phaseKey="codegen" number="6" title="Code Generation" icon={FiCpu}>
        <AssemblyCode
          optimizedCode={phases.optimizedCode}
          assemblyCode={phases.assemblyCode}
        />
      </PhaseCard>
    </div>
  );
}
