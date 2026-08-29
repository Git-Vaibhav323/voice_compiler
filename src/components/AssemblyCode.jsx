import { FiInfo, FiArrowRight } from "react-icons/fi";

/* Opcode → accent style */
const OPCODE_STYLES = {
  LOAD:  { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.25)",  text: "#a5b4fc" },
  STORE: { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.25)",  text: "#c4b5fd" },
  ADD:   { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)",  text: "#6ee7b7" },
  SUB:   { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.2)",   text: "#fcd34d" },
  MUL:   { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.25)",  text: "#93c5fd" },
  DIV:   { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.2)",   text: "#f9a8d4" },
  MOD:   { bg: "rgba(6,182,212,0.10)",   border: "rgba(6,182,212,0.2)",    text: "#67e8f9" },
  CMP:   { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.2)",   text: "#fcd34d" },
  JMP:   { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.2)",    text: "#fca5a5" },
  JE:    { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.2)",    text: "#fca5a5" },
  JNE:   { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.2)",    text: "#fca5a5" },
  JL:    { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.2)",    text: "#fca5a5" },
  JG:    { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.2)",    text: "#fca5a5" },
  CALL:  { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.25)",  text: "#d8b4fe" },
  RET:   { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.25)",  text: "#d8b4fe" },
  PUSH:  { bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.2)",   text: "#a5b4fc" },
  POP:   { bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.2)",   text: "#a5b4fc" },
  DEFAULT:{ bg:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.1)",   text:"rgba(255,255,255,0.5)" },
};

const getOpcodeStyle = (op) => OPCODE_STYLES[op?.toUpperCase()] || OPCODE_STYLES.DEFAULT;

const explain = (line) => {
  const op = line.trim().split(/\s+/)[0]?.toUpperCase();
  const EXPLAINS = {
    LOAD:  "Loads a value from memory into a register",
    STORE: "Stores a register value back to memory",
    ADD:   "Adds operand to register",
    SUB:   "Subtracts operand from register",
    MUL:   "Multiplies register by operand",
    DIV:   "Divides register by operand",
    MOD:   "Computes remainder",
    CMP:   "Compares two values and sets flags",
    JMP:   "Unconditional jump to label",
    JE:    "Jump if equal",
    JNE:   "Jump if not equal",
    JL:    "Jump if less than",
    JG:    "Jump if greater than",
    CALL:  "Calls a function, saves return address",
    RET:   "Returns from function",
    PUSH:  "Pushes value onto stack",
    POP:   "Pops value from stack",
    SETL:  "Set register 1 if less than",
    SETG:  "Set register 1 if greater than",
    SETE:  "Set register 1 if equal",
  };
  return EXPLAINS[op] || "Performs the specified operation";
};

const AssemblyCode = ({ optimizedCode, assemblyCode }) => {
  if (!assemblyCode || !Array.isArray(assemblyCode) || assemblyCode.length === 0) {
    return (
      <div
        className="py-8 text-center rounded-xl text-sm"
        style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        No assembly code available.
      </div>
    );
  }

  /* TAC → Assembly mapping */
  const mapTacToAssembly = () => {
    if (!optimizedCode?.length) return [];
    const mapping = [];
    let idx = 0;
    for (const tac of optimizedCode) {
      const start = idx;
      if (tac.includes("*") || tac.includes("+") || tac.includes("-")) idx += 3;
      else idx += 2;
      mapping.push({ tac, assembly: assemblyCode.slice(start, Math.min(idx, assemblyCode.length)) });
    }
    return mapping;
  };

  const tacMap = mapTacToAssembly();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Target assembly — register machine</span>
        <span
          className="font-code text-xs px-2.5 py-0.5 rounded-full"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }}
        >
          Generic ISA
        </span>
      </div>

      {/* Code block */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#060810", border: "1px solid var(--border)" }}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(16,185,129,0.04)" }}
        >
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>
          <span className="font-code text-xs ml-2" style={{ color: "var(--text-muted)" }}>output.asm</span>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block p-3 overflow-x-auto">
          <div className="space-y-0.5">
            {assemblyCode.map((line, i) => {
              const opcode = line.trim().split(/\s+/)[0];
              const os = getOpcodeStyle(opcode);
              return (
                <div
                  key={i}
                  className="grid gap-3 items-center rounded-lg px-3 py-1.5 transition-colors"
                  style={{
                    gridTemplateColumns: "2rem 1fr 5rem 1fr",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <span className="font-code text-xs text-right" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                  <code className="font-code text-sm" style={{ color: "#6ee7b7" }}>{line}</code>
                  <span>
                    <span
                      className="font-code text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: os.bg, border: `1px solid ${os.border}`, color: os.text }}
                    >
                      {opcode}
                    </span>
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{explain(line)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-2">
          {assemblyCode.map((line, i) => {
            const opcode = line.trim().split(/\s+/)[0];
            const os = getOpcodeStyle(opcode);
            return (
              <div
                key={i}
                className="rounded-lg p-3"
                style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-code text-xs" style={{ color: "var(--text-muted)" }}>Line {i + 1}</span>
                  <span
                    className="font-code text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: os.bg, border: `1px solid ${os.border}`, color: os.text }}
                  >
                    {opcode}
                  </span>
                </div>
                <code className="block font-code text-sm mb-1" style={{ color: "#6ee7b7" }}>{line}</code>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{explain(line)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* TAC → ASM mapping */}
      {tacMap.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
        >
          <h3
            className="text-xs font-semibold mb-3 flex items-center gap-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <FiArrowRight className="w-3.5 h-3.5" style={{ color: "#6ee7b7" }} />
            TAC → Assembly mapping
          </h3>
          <div className="space-y-3">
            {tacMap.map((m, i) => (
              <div key={i} style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                <div className="font-code text-xs mb-1.5" style={{ color: "#fcd34d" }}>{m.tac}</div>
                <div className="pl-3" style={{ borderLeft: "2px solid rgba(99,102,241,0.25)" }}>
                  {m.assembly.map((a, j) => (
                    <div key={j} className="font-code text-xs mb-0.5" style={{ color: "#6ee7b7" }}>{a}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info panel */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs"
        style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", color: "var(--text-secondary)" }}
      >
        <FiInfo className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#6ee7b7" }} />
        <div>
          <span className="font-semibold" style={{ color: "#6ee7b7" }}>Assembly Code</span>
          {" "}— LOAD/STORE moves values between memory and registers. ADD/SUB/MUL/DIV operate
          on register values. Register allocation — deciding which values live in which
          registers — is where real compilers spend considerable effort.
        </div>
      </div>
    </div>
  );
};

export default AssemblyCode;
