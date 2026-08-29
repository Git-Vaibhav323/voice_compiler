import { FiInfo, FiArrowRight } from "react-icons/fi";

const CodeOptimizer = ({ intermediateCode, optimizedCode }) => {
  if (!optimizedCode || optimizedCode.length === 0) {
    return (
      <div className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        No optimized code available.
      </div>
    );
  }

  const before = intermediateCode || [];
  const after = optimizedCode;

  const getOptimizationType = () => {
    if (before.length > after.length) return "Redundant Code Elimination";
    if (before.some((l) => l.includes("t2")) && !after.some((l) => l.includes("t2")))
      return "Temporary Variable Elimination";
    if (before.length === after.length && JSON.stringify(before) !== JSON.stringify(after))
      return "Algebraic Simplification";
    return "No Optimization Applied";
  };

  const getDetails = () => {
    if (before.length > after.length) {
      const removed = before.filter((l) => !after.includes(l));
      return `Eliminated ${removed.length} instruction${removed.length !== 1 ? "s" : ""}: ${removed.slice(0, 3).join(", ")}${removed.length > 3 ? "…" : ""}`;
    }
    const changes = before.map((l, i) => l !== after[i] ? `"${l}" → "${after[i]}"` : null).filter(Boolean);
    if (changes.length) return `Simplified: ${changes.slice(0, 2).join(", ")}`;
    return "Applied standard compiler optimizations.";
  };

  const saved = before.length - after.length;
  const optimizationType = getOptimizationType();

  /* Line colour helper */
  const lineColor = (line, isAfter = false) => {
    const t = line.trim();
    if (/^[A-Za-z_]\w*:$/.test(t)) return isAfter ? "#a5b4fc" : "rgba(165,180,252,0.5)";
    if (/^t\d+\s*=/.test(t)) return isAfter ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)";
    return isAfter ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Before and after optimization passes</span>
        <span
          className="font-code text-xs px-2.5 py-0.5 rounded-full"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#fcd34d" }}
        >
          {optimizationType}
        </span>
      </div>

      {/* Before / After panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Before */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#060810", border: "1px solid var(--border)" }}
        >
          <div
            className="px-4 py-2 font-code text-xs"
            style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", backgroundColor: "rgba(255,255,255,0.02)" }}
          >
            before.tac
          </div>
          <div className="p-4 overflow-x-auto">
            {before.map((line, i) => (
              <div key={i} className="flex items-baseline gap-4">
                <span className="font-code text-xs select-none w-5 text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                <code className="font-code text-sm leading-relaxed" style={{ color: lineColor(line, false) }}>{line}</code>
              </div>
            ))}
            {!before.length && <p className="font-code text-xs" style={{ color: "var(--text-muted)" }}>—</p>}
          </div>
        </div>

        {/* After */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "#060810", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div
            className="px-4 py-2 font-code text-xs flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(245,158,11,0.2)", backgroundColor: "rgba(245,158,11,0.04)" }}
          >
            <span style={{ color: "#fcd34d" }}>after.tac</span>
            {saved > 0 && (
              <span
                className="font-code text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }}
              >
                −{saved} instr
              </span>
            )}
          </div>
          <div className="p-4 overflow-x-auto">
            {after.map((line, i) => (
              <div key={i} className="flex items-baseline gap-4">
                <span className="font-code text-xs select-none w-5 text-right flex-shrink-0" style={{ color: "rgba(245,158,11,0.5)" }}>{i + 1}</span>
                <code className="font-code text-sm leading-relaxed font-medium" style={{ color: lineColor(line, true) }}>{line}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diff indicator */}
      {saved !== 0 && (
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <FiArrowRight className="w-3.5 h-3.5" style={{ color: "#fcd34d" }} />
          <span style={{ color: "var(--text-secondary)" }}>{getDetails()}</span>
        </div>
      )}

      {/* Info panel */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs"
        style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", color: "var(--text-secondary)" }}
      >
        <FiInfo className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#fcd34d" }} />
        <div>
          <span className="font-semibold" style={{ color: "#fcd34d" }}>Optimization passes</span>
          {" "}include constant folding, copy propagation, common subexpression elimination,
          and dead code elimination. Each pass preserves the exact semantics of the program.
        </div>
      </div>
    </div>
  );
};

export default CodeOptimizer;
