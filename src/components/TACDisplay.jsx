import { FiInfo } from "react-icons/fi";

const TACDisplay = ({ code }) => {
  if (!code || code.length === 0) {
    return (
      <div className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        No intermediate code to display.
      </div>
    );
  }

  /* Defensive: if the AI returned assembly in the TAC field, reformat it. */
  const formatted = code.map((line) => {
    if (line.startsWith("LOAD")) {
      const p = line.split(" ");
      return `t${p[1]} = ${p[1]}`;
    }
    if (line.startsWith("STORE")) {
      const p = line.split(" ");
      return `${p[1]} = result`;
    }
    if (line.startsWith("ADD") || line.startsWith("MUL")) {
      const p = line.split(" ");
      const op = line.startsWith("ADD") ? "+" : "*";
      return `t${p[1]} = ${p[1]} ${op} ${p[2] || "value"}`;
    }
    return line;
  });

  /* Colour-code by line kind */
  const lineColor = (line) => {
    const t = line.trim();
    if (/^[A-Za-z_]\w*:$/.test(t)) return "#a5b4fc";           // label
    if (/^(func|endfunc)\b/.test(t)) return "#c4b5fd";          // func header
    if (/^(goto|ifFalse)\b/.test(t)) return "#fcd34d";          // jump
    if (/^(param|call)\b/.test(t)) return "#6ee7b7";            // call protocol
    if (/^t\d+\s*=/.test(t)) return "rgba(255,255,255,0.75)";  // temp assign
    return "rgba(255,255,255,0.55)";                             // other
  };

  return (
    <div className="space-y-3">
      {/* Code block */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#060810", border: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(99,102,241,0.05)" }}
        >
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>
          <span className="font-code text-xs ml-2" style={{ color: "var(--text-muted)" }}>
            three-address-code.tac
          </span>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="space-y-0.5">
            {formatted.map((line, i) => (
              <div key={i} className="flex items-baseline gap-4 group">
                <span
                  className="font-code text-xs select-none flex-shrink-0 w-6 text-right"
                  style={{ color: "var(--text-muted)" }}
                >
                  {i + 1}
                </span>
                <code
                  className="font-code text-sm leading-relaxed"
                  style={{ color: lineColor(line) }}
                >
                  {line}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs"
        style={{
          background: "rgba(99,102,241,0.06)",
          border: "1px solid rgba(99,102,241,0.15)",
          color: "var(--text-secondary)",
        }}
      >
        <FiInfo className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#a5b4fc" }} />
        <div>
          <span className="font-semibold" style={{ color: "#a5b4fc" }}>Three-Address Code (TAC)</span>
          {" "}— each instruction has at most three operands. Temporary variables (t1, t2…) hold
          intermediate results. Complex expressions are broken into simple steps, then passed
          to the optimiser.
        </div>
      </div>
    </div>
  );
};

export default TACDisplay;
