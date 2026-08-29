import { useState } from "react";
import {
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiInfo,
  FiX,
} from "react-icons/fi";

/* ─── Token type → accent colours (indigo/violet palette) ──────────── */
const TOKEN_STYLES = {
  IDENTIFIER:  { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.25)", text: "#c4b5fd" },
  OPERATOR:    { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.25)",  text: "#a5b4fc" },
  KEYWORD:     { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.25)",  text: "#93c5fd" },
  CONSTANT:    { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)",  text: "#6ee7b7" },
  LITERAL:     { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)",  text: "#6ee7b7" },
  NUMBER:      { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.25)",  text: "#6ee7b7" },
  STRING:      { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.25)",  text: "#f9a8d4" },
  STRING_LITERAL: { bg: "rgba(236,72,153,0.10)", border: "rgba(236,72,153,0.25)", text: "#f9a8d4" },
  PUNCTUATOR:  { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.2)",   text: "#fcd34d" },
  PUNCTUATION: { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.2)",   text: "#fcd34d" },
  DELIMITER:   { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.2)",   text: "#fcd34d" },
  PREPROCESSOR:{ bg: "rgba(6,182,212,0.10)",   border: "rgba(6,182,212,0.2)",    text: "#67e8f9" },
  DEFAULT:     { bg: "rgba(255,255,255,0.05)",  border: "rgba(255,255,255,0.1)",  text: "rgba(255,255,255,0.55)" },
};

const getTokenStyle = (type) => {
  if (!type) return TOKEN_STYLES.DEFAULT;
  const u = type.toUpperCase();
  for (const [key, val] of Object.entries(TOKEN_STYLES)) {
    if (u.includes(key)) return val;
  }
  return TOKEN_STYLES.DEFAULT;
};

const TokenTable = ({ tokens }) => {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterText, setFilterText] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
      >
        <FiInfo className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tokens to display</p>
      </div>
    );
  }

  const normalized = tokens.map((t, i) =>
    t.lexeme && t.token
      ? { ...t, _index: i }
      : { lexeme: t.value || t.lexeme || "", token: t.type || t.token || "UNKNOWN", attribute: t.attribute || t.line || null, _index: i }
  );

  const filtered = normalized.filter((t) => {
    const s = filterText.toLowerCase();
    return (
      (t.lexeme || "").toLowerCase().includes(s) ||
      (t.token || "").toLowerCase().includes(s) ||
      (t.attribute ? t.attribute.toString().toLowerCase().includes(s) : false)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    const av = (a[sortField] || "").toString();
    const bv = (b[sortField] || "").toString();
    return sortDirection === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const handleSort = (f) => {
    if (sortField === f) setSortDirection(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDirection("asc"); }
  };

  const tokenTypes = [...new Set(normalized.map((t) => t.token).filter(Boolean))];
  const hasFilters = filterText || sortField;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Header bar */}
      <div
        className="px-4 py-3 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center"
        style={{ backgroundColor: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Tokens</span>
          <span
            className="font-code text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", color: "#a5b4fc" }}
          >
            {filtered.length}/{normalized.length}
          </span>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search tokens…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-mid)",
                color: "var(--text-primary)",
                caretColor: "#a5b4fc",
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: showFilters ? "rgba(99,102,241,0.15)" : "var(--bg-elevated)",
              border: showFilters ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--border-mid)",
              color: showFilters ? "#a5b4fc" : "var(--text-secondary)",
            }}
            title="Filter by type"
          >
            <FiFilter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-4 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center"
          style={{ backgroundColor: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}>
          <select
            onChange={(e) => setFilterText(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-mid)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All token types</option>
            {tokenTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setFilterText(""); setSortField(null); setSortDirection("asc"); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <FiX className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}>
              <th className="px-4 py-3 text-left font-code text-xs" style={{ color: "var(--text-muted)" }}>#</th>
              {[
                { key: "lexeme", label: "VALUE" },
                { key: "token", label: "TYPE" },
                { key: "attribute", label: "ATTRIBUTE" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="px-4 py-3 text-left font-code text-xs cursor-pointer transition-colors select-none"
                  style={{ color: sortField === key ? "#a5b4fc" : "var(--text-muted)" }}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortField === key
                      ? sortDirection === "asc"
                        ? <FiChevronUp className="w-3 h-3" />
                        : <FiChevronDown className="w-3 h-3" />
                      : <FiChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-40" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-4 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No tokens match your search
                </td>
              </tr>
            ) : (
              sorted.map((token, idx) => {
                const style = getTokenStyle(token.token);
                return (
                  <tr
                    key={token._index ?? idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <td className="px-4 py-3 font-code text-xs" style={{ color: "var(--text-muted)" }}>
                      {(token._index ?? idx) + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-code text-xs px-2.5 py-1 rounded cursor-pointer transition-all"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--border-mid)",
                          color: "var(--text-primary)",
                        }}
                        onClick={() => navigator.clipboard.writeText(token.lexeme).catch(() => {})}
                        title="Click to copy"
                      >
                        {token.lexeme || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-code text-xs px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: style.bg,
                          border: `1px solid ${style.border}`,
                          color: style.text,
                        }}
                      >
                        {token.token || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-code text-xs" style={{ color: token.attribute ? "var(--text-secondary)" : "var(--text-muted)" }}>
                      {token.attribute || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div
          className="px-4 py-2 font-code text-xs"
          style={{
            backgroundColor: "var(--bg-raised)",
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          {sorted.length} token{sorted.length !== 1 ? "s" : ""}
          {hasFilters && " · filtered"}
          {sortField && ` · sorted by ${sortField} ${sortDirection}`}
        </div>
      )}
    </div>
  );
};

export default TokenTable;
