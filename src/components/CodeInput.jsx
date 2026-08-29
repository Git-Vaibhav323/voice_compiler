import { useEffect, useState, useRef } from "react";
import {
  FiPlay,
  FiCode,
  FiCopy,
  FiAlertCircle,
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiLoader,
} from "react-icons/fi";

const CodeInput = ({ code, onChange, onAnalyze, loading }) => {
  const [localCode, setLocalCode] = useState(code);
  const [showExamples, setShowExamples] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => { setLocalCode(code); }, [code]);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocalCode(v);
    onChange(v);
  };

  const examples = [
    { title: "Simple Assignment", code: "int total = price + rate * 60;", description: "Arithmetic with operator precedence" },
    { title: "For Loop", code: "int sum = 0;\nfor (int i = 1; i <= 10; i++) {\n    sum = sum + i;\n}", description: "Loop → labels and jumps" },
    { title: "Conditional", code: "int y;\nif (x > 0) {\n    y = x * 2;\n}", description: "If statement with comparison" },
    { title: "Function", code: "int square(int n) {\n    return n * n;\n}", description: "Function definition and return" },
    { title: "Array Access", code: "int arr[5];\nfor (int i = 0; i < 5; i++) {\n    arr[i] = i * i;\n}", description: "Array subscript inside a loop" },
    { title: "Full Program", code: "#include <stdio.h>\n\nint main() {\n    int a = 5;\n    int b = 3;\n    int c = a * b + 2;\n    printf(\"%d\", c);\n    return 0;\n}", description: "Complete C program with main()" },
  ];

  const validateCode = (c) => {
    if (!c.trim()) return { isValid: false, message: "Code cannot be empty", level: "warning" };
    if (c.length > 8000) return { isValid: false, message: "Code is too long for analysis (max 8000 characters)", level: "error" };
    for (const { pattern, message } of [
      { pattern: /<script>/i, message: "Script tags are not allowed" },
      { pattern: /javascript:/i, message: "JavaScript protocol is not allowed" },
      { pattern: /onerror|onload|onclick=/i, message: "HTML event handlers are not allowed" },
    ]) {
      if (pattern.test(c)) return { isValid: false, message, level: "error" };
    }
    const stack = [];
    const pairs = { "(": ")", "[": "]", "{": "}" };
    const quotes = [];
    for (let i = 0; i < c.length; i++) {
      const ch = c[i];
      if (ch === '"' || ch === "'") {
        if (quotes.length === 0) quotes.push(ch);
        else if (quotes[quotes.length - 1] === ch) quotes.pop();
        else quotes.push(ch);
        continue;
      }
      if (quotes.length === 0) {
        if (pairs[ch]) { stack.push({ ch, p: i }); }
        else if (Object.values(pairs).includes(ch)) {
          if (!stack.length) return { isValid: false, message: `Unexpected '${ch}' at position ${i + 1}`, level: "warning" };
          const last = stack.pop();
          if (pairs[last.ch] !== ch) return { isValid: false, message: `Mismatched brackets at position ${i + 1}`, level: "warning" };
        }
      }
    }
    if (stack.length) return { isValid: false, message: `Unclosed '${stack[stack.length - 1].ch}'`, level: "warning" };
    if (quotes.length) return { isValid: false, message: "Unclosed string literal", level: "warning" };
    return { isValid: true, message: "", level: "success" };
  };

  const validation = validateCode(localCode);
  const hasIssues = !validation.isValid && localCode.trim();

  const borderColor = hasIssues
    ? validation.level === "error" ? "rgba(239,68,68,0.5)" : "rgba(245,158,11,0.5)"
    : "var(--border-mid)";

  return (
    <div
      className="rounded-2xl p-5 md:p-6 mb-6"
      style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <FiCode className="w-4 h-4" style={{ color: "#a5b4fc" }} />
          </div>
          <div>
            <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Code Input</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Edit the generated C code, or write your own</p>
          </div>
        </div>

        <button
          onClick={() => localCode.trim() && onAnalyze()}
          disabled={loading || !localCode.trim()}
          className="btn-primary"
        >
          {loading
            ? <><FiLoader className="w-4 h-4 animate-spin" />Analyzing…</>
            : <><FiPlay className="w-4 h-4" />Analyze Code</>
          }
        </button>
      </div>

      {/* Textarea */}
      <div className="relative mb-4 group">
        <textarea
          ref={textareaRef}
          value={localCode}
          onChange={handleChange}
          className="w-full h-56 md:h-64 p-4 font-code text-sm rounded-xl outline-none resize-none transition-all leading-relaxed"
          style={{
            backgroundColor: "#060810",
            border: `1px solid ${borderColor}`,
            color: "rgba(255,255,255,0.85)",
            caretColor: "#a5b4fc",
          }}
          placeholder="Enter C code to analyze, or generate it with your voice above"
          spellCheck="false"
        />

        {/* Hover actions */}
        {localCode && (
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => navigator.clipboard.writeText(localCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
              className="p-1.5 rounded-lg cursor-pointer transition-all"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}
              title="Copy code"
            >
              <FiCopy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setLocalCode(""); onChange(""); textareaRef.current?.focus(); }}
              className="p-1.5 rounded-lg cursor-pointer transition-all"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(252,165,165,0.9)" }}
              title="Clear code"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Char count */}
        <div
          className="absolute bottom-3 right-3 font-code text-xs px-2 py-0.5 rounded"
          style={{ background: "rgba(8,9,12,0.8)", color: "var(--text-muted)" }}
        >
          {localCode.length}
        </div>
      </div>

      {/* Validation feedback */}
      {hasIssues && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 mb-4 text-sm"
          style={{
            background: validation.level === "error" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.07)",
            border: `1px solid ${validation.level === "error" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
            color: validation.level === "error" ? "rgba(252,165,165,0.9)" : "rgba(253,224,71,0.85)",
          }}
        >
          <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-xs mb-0.5">
              {validation.level === "error" ? "Security Issue" : "Syntax Issue"}
            </p>
            <p className="text-xs">{validation.message}</p>
          </div>
        </div>
      )}

      {/* Examples section */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="flex items-center gap-3 w-full text-left p-2 rounded-xl cursor-pointer transition-all group"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <FiBookOpen className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <div className="flex-1">
            <span className="font-medium text-sm">Code Examples</span>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>common C patterns</span>
          </div>
          {showExamples
            ? <FiChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            : <FiChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          }
        </button>

        {showExamples && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => { setLocalCode(ex.code); onChange(ex.code); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="text-left p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  backgroundColor: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
                  e.currentTarget.style.backgroundColor = "rgba(99,102,241,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.backgroundColor = "var(--bg-raised)";
                }}
              >
                <div className="font-medium text-xs mb-1.5" style={{ color: "var(--text-primary)" }}>{ex.title}</div>
                <div
                  className="font-code text-xs p-2 rounded-lg mb-1.5 overflow-hidden"
                  style={{ backgroundColor: "#060810", color: "#6ee7b7", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                >
                  {ex.code.split("\n")[0]}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{ex.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Copy toast */}
      {copied && (
        <div
          className="fixed bottom-6 right-6 z-50 text-sm px-4 py-2.5 rounded-xl shadow-xl animate-fadeInOut"
          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}
        >
          ✓ Copied to clipboard
        </div>
      )}
    </div>
  );
};

export default CodeInput;
