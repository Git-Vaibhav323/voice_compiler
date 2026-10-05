import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  FiAlertTriangle,
  FiCopy,
  FiMaximize,
  FiZoomIn,
  FiZoomOut,
  FiCode,
  FiBookOpen,
  FiLoader,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import Tree from "react-d3-tree";

/* ─────────────────────────────────────────────────────────────────
   Node colour palette
   ───────────────────────────────────────────────────────────────── */
const NODE_COLORS = {
  operator:    { fill: "#EEF2FF", stroke: "#4F46E5", text: "#3730A3" },
  identifier:  { fill: "#F5F3FF", stroke: "#7C3AED", text: "#5B21B6" },
  literal:     { fill: "#ECFDF5", stroke: "#059669", text: "#065F46" },
  function:    { fill: "#FFFBEB", stroke: "#D97706", text: "#92400E" },
  keyword:     { fill: "#EFF6FF", stroke: "#2563EB", text: "#1E40AF" },
  declaration: { fill: "#ECFEFF", stroke: "#0891B2", text: "#164E63" },
  default:     { fill: "#F8FAFC", stroke: "#64748B", text: "#1E293B" },
};

const MAX_CHARS = 16;
const trimLabel = (s) =>
  s && s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + "…" : (s ?? "");

/* ─────────────────────────────────────────────────────────────────
   Layout helpers — mirror react-d3-tree's breadth-first placement
   so we can compute the bounding box before the library renders.
   ───────────────────────────────────────────────────────────────── */
const NODE_W = 220;
const NODE_H = 110;

function collectPositions(node, x = 0, y = 0, out = []) {
  if (!node) return out;
  out.push({ x, y });
  const kids = node.children || [];
  if (kids.length) {
    const totalSpan = (kids.length - 1) * NODE_W * 1.5;
    const startX = x - totalSpan / 2;
    kids.forEach((child, i) => {
      collectPositions(child, startX + i * NODE_W * 1.5, y + NODE_H, out);
    });
  }
  return out;
}

function fitTree(node, w, h, padding = 56) {
  if (!node || w <= 0 || h <= 0) {
    return { zoom: 0.65, translate: { x: w / 2, y: padding } };
  }
  const pts = collectPositions(node);
  if (!pts.length) {
    return { zoom: 0.65, translate: { x: w / 2, y: padding } };
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const treeW = maxX - minX + NODE_W;
  const treeH = maxY - minY + NODE_H;

  const scaleX = (w - padding * 2) / treeW;
  const scaleY = (h - padding * 2) / treeH;
  const zoom   = Math.max(Math.min(scaleX, scaleY, 1.1), 0.15);

  // Centre the bounding box
  const tx = w / 2 - ((minX + maxX) / 2) * zoom;
  const ty = padding - minY * zoom;

  return { zoom, translate: { x: tx, y: ty } };
}

/* ─────────────────────────────────────────────────────────────────
   Collapse nodes deeper than maxDepth
   ───────────────────────────────────────────────────────────────── */
function collapseDeep(node, depth = 0, max = 4) {
  if (!node) return node;
  const kids = node.children || [];
  if (depth >= max && kids.length) {
    return { ...node, _collapsed: true, _collapsedCount: countDesc(node), children: [] };
  }
  return { ...node, children: kids.map((c) => collapseDeep(c, depth + 1, max)) };
}
function countDesc(n) {
  return (n.children || []).reduce((s, c) => s + 1 + countDesc(c), 0);
}

/* ─────────────────────────────────────────────────────────────────
   Fix swapped name / label fields the AI sometimes emits
   ───────────────────────────────────────────────────────────────── */
const LABEL_WORDS = new Set([
  "IDENTIFIER","OPERATOR","LITERAL","ASSIGNMENT","SUBTRACTION",
  "ADDITION","MULTIPLICATION","DIVISION","NUMBER","VARIABLE",
  "EXPRESSION","FUNCTION","DECLARATION","KEYWORD","PARAMETER",
  "ARGUMENT","STATEMENT","PROGRAM","BLOCK","RETURN","IF","WHILE","FOR",
]);
const isLabelWord = (s) =>
  s && (LABEL_WORDS.has(s.toUpperCase()) ||
        (s === s.toUpperCase() && s.length > 1 && /^[A-Z_]+$/.test(s)));
const opLabel = (op) =>
  ({"+":"ADDITION","-":"SUBTRACTION","*":"MULTIPLICATION","/":"DIVISION",
    "=":"ASSIGNMENT",":=":"ASSIGNMENT"})[op] ?? "OPERATOR";

function fixNode(n) {
  if (!n) return n;
  let node = { ...n };
  if (node.attributes?.label) {
    if (isLabelWord(node.name) && !isLabelWord(node.attributes.label)) {
      const tmp = node.name;
      node.name = node.attributes.label;
      node.attributes = { ...node.attributes, label: tmp };
    }
  }
  if (node.name && /^[+\-*/:=]{1,2}$/.test(node.name.trim())) {
    node.attributes = {
      ...(node.attributes || {}),
      type: "operator",
      label: opLabel(node.name.trim()),
    };
  }
  if (node.children?.length) node.children = node.children.map(fixNode);
  return node;
}

/* ─────────────────────────────────────────────────────────────────
   Build a fallback tree from a plain expression string
   ───────────────────────────────────────────────────────────────── */
function buildFallbackTree(code) {
  if (!code) throw new Error("No expression");
  const raw = code.includes("Expression:")
    ? (code.match(/Expression:\s*(.+)/)?.[1]?.trim() ?? code)
    : code;

  const opNames = {
    "+":"ADDITION","-":"SUBTRACTION","*":"MULTIPLICATION",
    "/":"DIVISION","%":"MODULO",
  };

  function parseExpr(e) {
    e = e.trim();
    if (!e) return { name: "?", attributes: { type: "literal", label: "EMPTY" } };
    for (const op of ["-", "+", "%", "*", "/"]) {
      const idx = op === "-" ? e.lastIndexOf("-") : e.indexOf(op);
      if (idx > 0) {
        return {
          name: op,
          attributes: { type: "operator", label: opNames[op] },
          children: [parseExpr(e.slice(0, idx)), parseExpr(e.slice(idx + 1))],
        };
      }
    }
    const isNum = /^-?\d+(\.\d+)?$/.test(e);
    return {
      name: e,
      attributes: { type: isNum ? "literal" : "identifier", label: isNum ? "NUMBER" : "IDENTIFIER" },
    };
  }

  const hasAssign =
    (raw.includes(":=") || raw.includes("=")) && !raw.includes("==");
  if (hasAssign) {
    const op = raw.includes(":=") ? ":=" : "=";
    const [l, ...rest] = raw.split(op);
    return {
      name: op,
      attributes: { type: "operator", label: "ASSIGNMENT" },
      children: [
        { name: l.trim(), attributes: { type: "identifier", label: "IDENTIFIER" } },
        parseExpr(rest.join(op)),
      ],
    };
  }
  return { name: raw, attributes: { type: "default", label: "EXPRESSION" }, children: [] };
}

/* ─────────────────────────────────────────────────────────────────
   Custom SVG node — factory so showLabels can be captured in closure
   without triggering a re-render cascade from react-d3-tree
   ───────────────────────────────────────────────────────────────── */
function makeRenderNode(showLabels) {
  return function RenderNode({ nodeDatum }) {
    const type  = nodeDatum.attributes?.type ?? "default";
    const label = (nodeDatum.attributes?.label ?? "").toString();
    const c     = NODE_COLORS[type] ?? NODE_COLORS.default;
    const name  = trimLabel(nodeDatum.name);
    const W = 160, H = 44;

    const badgeW = label.length * 6.2 + 18;

    return (
      <g style={{ cursor: "pointer" }}>
        <title>{nodeDatum.name}</title>

        {/* Node rectangle */}
        <rect
          x={-W / 2} y={-H / 2}
          width={W} height={H} rx={8}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth={1.8}
          style={{ filter: `drop-shadow(0 2px 8px rgba(0,0,0,0.12))` }}
        />

        {/* Node text — clean sans-serif */}
        <text
          x={0} y={showLabels && label ? 3 : 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={c.text}
          fontSize={12}
          fontFamily="'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif"
          fontWeight={600}
        >
          {name}
        </text>

        {/* Badge above — pill label */}
        {showLabels && label && (
          <g>
            <rect
              x={-badgeW / 2} y={-H / 2 - 22}
              width={badgeW} height={16} rx={8}
              fill={c.stroke}
              stroke="none"
            />
            <text
              x={0} y={-H / 2 - 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={8.5}
              fontFamily="'Inter','Segoe UI',Arial,sans-serif"
              fontWeight={700}
              letterSpacing={0.8}
            >
              {label}
            </text>
          </g>
        )}

        {/* Collapsed "+N" badge */}
        {nodeDatum._collapsed && (
          <g>
            <rect
              x={-20} y={H / 2 + 2}
              width={40} height={17} rx={8}
              fill="rgba(212,165,116,0.15)"
              stroke="rgba(212,165,116,0.45)"
              strokeWidth={0.8}
            />
            <text
              x={0} y={H / 2 + 10}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#D4A574"
              fontSize={9}
              fontFamily="'JetBrains Mono',monospace"
            >
              +{nodeDatum._collapsedCount ?? "?"}
            </text>
          </g>
        )}
      </g>
    );
  };
}

/* ─────────────────────────────────────────────────────────────────
   Text-view renderer
   ───────────────────────────────────────────────────────────────── */
function TextAST({ astString }) {
  const code = astString
    ? (astString.match(/Expression:\s*(.+)/)?.[1]?.trim() ?? astString.trim())
    : "";

  const opNames = {
    "+": "Addition", "-": "Subtraction",
    "*": "Multiplication", "/": "Division", "%": "Modulo",
  };

  function renderExpr(expr) {
    for (const op of ["-", "+", "*", "/", "%"]) {
      const idx = op === "-" ? expr.lastIndexOf("-") : expr.indexOf(op);
      if (idx > 0) {
        const lp = expr.slice(0, idx).trim();
        const rp = expr.slice(idx + 1).trim();
        return (
          <div>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--text-muted)" }}>└─</span>
              <span className="font-code" style={{ color: "#818CF8" }}>{op}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>({opNames[op]})</span>
            </div>
            <div className="pl-6 space-y-1 mt-1">
              {[lp, rp].map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ color: "var(--text-muted)" }}>{i === 0 ? "├─" : "└─"}</span>
                  <span className="font-code" style={{ color: /^\d+$/.test(p) ? "#34D399" : "#A78BFA" }}>{p}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    ({/^\d+$/.test(p) ? "Number" : "Variable"})
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
    return (
      <div className="flex items-center gap-2">
        <span className="font-code" style={{ color: "#A78BFA" }}>{expr}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          ({/^\d+$/.test(expr) ? "Number" : "Variable"})
        </span>
      </div>
    );
  }

  const hasAssign = code && (code.includes(":=") || (code.includes("=") && !code.includes("==")));
  const assignOp  = hasAssign ? (code.includes(":=") ? ":=" : "=") : "";
  const parts     = assignOp ? code.split(assignOp) : [];
  const left      = parts[0]?.trim() ?? "";
  const right     = parts.slice(1).join(assignOp).trim();

  return (
    <div className="h-full overflow-auto p-4">
      <div
        className="rounded-xl p-5 max-w-2xl mx-auto"
        style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border)" }}
      >
        <h3 className="font-semibold mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Abstract Syntax Tree — Text View
        </h3>
        <div className="mb-4">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Expression:</p>
          <p
            className="font-code text-sm px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}
          >
            {code || "—"}
          </p>
        </div>
        {assignOp ? (
          <div className="space-y-2 font-code text-sm">
            <div className="flex items-center gap-2">
              <span className="font-code" style={{ color: "#818CF8" }}>{assignOp}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>(Assignment)</span>
            </div>
            <div className="pl-5 space-y-1">
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--text-muted)" }}>├─</span>
                <span className="font-code" style={{ color: "#A78BFA" }}>{left}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>(Variable)</span>
              </div>
              {renderExpr(right)}
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {code ? "Simple expression — no assignment detected." : "No expression available."}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────────────────────────── */
export default function ASTVisualization({ astString, astTree }) {
  const [treeData,     setTreeData]     = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState(null);
  const [viewMode,     setViewMode]     = useState("visual");
  const [showLabels,   setShowLabels]   = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied,       setCopied]       = useState(false);

  // Separate view-state for inline vs modal so they never interfere
  const [inlineView, setInlineView] = useState({ zoom: 0.65, translate: { x: 300, y: 60 } });
  const [modalView,  setModalView]  = useState({ zoom: 0.65, translate: { x: 300, y: 60 } });

  const inlineRef  = useRef(null);
  const modalRef   = useRef(null);
  const triggerRef = useRef(null);

  // Re-create the render function only when showLabels toggles
  const renderNode = useMemo(() => makeRenderNode(showLabels), [showLabels]);

  /* ── Build tree ─────────────────────────────────────────────────── */
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setTreeData(null);

    const id = setTimeout(() => {
      try {
        let data = null;
        if (astTree && typeof astTree === "object" && astTree.name) {
          data = collapseDeep(fixNode(astTree), 0, 4);
        } else if (astString) {
          data = buildFallbackTree(astString);
        }
        setTreeData(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }, 120);

    return () => clearTimeout(id);
  }, [astTree, astString]);

  /* ── Auto-fit helpers ───────────────────────────────────────────── */
  const fitInline = useCallback(() => {
    const el = inlineRef.current;
    if (!el || !treeData) return;
    setInlineView(fitTree(treeData, el.clientWidth, el.clientHeight));
  }, [treeData]);

  const fitModal = useCallback(() => {
    const el = modalRef.current;
    if (!el || !treeData) return;
    setModalView(fitTree(treeData, el.clientWidth, el.clientHeight));
  }, [treeData]);

  /* ── Auto-fit when treeData arrives or container resizes ─────────── */
  useEffect(() => {
    if (!treeData || !inlineRef.current) return;
    // Wait one frame for the container to have real dimensions
    const id = requestAnimationFrame(() => fitInline());
    const obs = new ResizeObserver(() => fitInline());
    obs.observe(inlineRef.current);
    return () => { cancelAnimationFrame(id); obs.disconnect(); };
  }, [treeData, fitInline]);

  useEffect(() => {
    if (!isFullscreen || !treeData || !modalRef.current) return;
    const id = requestAnimationFrame(() => fitModal());
    const obs = new ResizeObserver(() => fitModal());
    obs.observe(modalRef.current);
    return () => { cancelAnimationFrame(id); obs.disconnect(); };
  }, [isFullscreen, treeData, fitModal]);

  /* ── Fullscreen: Escape, focus trap, body scroll lock ───────────── */
  useEffect(() => {
    if (!isFullscreen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") closeFullscreen(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const openFullscreen  = () => { triggerRef.current = document.activeElement; setIsFullscreen(true); };
  const closeFullscreen = () => {
    setIsFullscreen(false);
    setTimeout(() => triggerRef.current?.focus(), 50);
  };

  /* ── Loading / error states ─────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "var(--text-muted)" }}>
        <FiLoader className="w-6 h-6 animate-spin" />
        <p className="text-sm">Building syntax tree…</p>
      </div>
    );
  }

  /* ── Shared toolbar ─────────────────────────────────────────────── */
  const Toolbar = ({ inModal = false, onFit }) => (
    <div className="flex flex-wrap gap-2 items-center justify-between">
      {/* Left: view toggles */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { mode: "visual", label: "Visual Tree", icon: <FiBookOpen className="w-3 h-3" /> },
          { mode: "text",   label: "Text View",   icon: <FiCode     className="w-3 h-3" /> },
        ].map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
            style={{
              background: viewMode === mode ? "rgba(129,140,248,0.18)" : "rgba(255,255,255,0.04)",
              border:     viewMode === mode ? "1px solid rgba(129,140,248,0.4)" : "1px solid var(--border)",
              color:      viewMode === mode ? "#C7D2FE" : "var(--text-secondary)",
            }}
          >
            {icon}{label}
          </button>
        ))}
        <button
          onClick={() => setShowLabels(!showLabels)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
          style={{
            background: showLabels ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.04)",
            border:     showLabels ? "1px solid rgba(52,211,153,0.3)" : "1px solid var(--border)",
            color:      showLabels ? "#A7F3D0" : "var(--text-secondary)",
          }}
        >
          {showLabels ? "Hide Labels" : "Show Labels"}
        </button>
      </div>

      {/* Right: zoom + fit + fullscreen / close */}
      <div className="flex gap-1.5">
        {viewMode === "visual" && (
          <>
            <button
              onClick={() => {
                const setter = inModal ? setModalView : setInlineView;
                setter((v) => ({ ...v, zoom: Math.max(v.zoom - 0.15, 0.15) }));
              }}
              className="p-1.5 rounded-lg cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              title="Zoom out"
            >
              <FiZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const setter = inModal ? setModalView : setInlineView;
                setter((v) => ({ ...v, zoom: Math.min(v.zoom + 0.15, 2.5) }));
              }}
              className="p-1.5 rounded-lg cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              title="Zoom in"
            >
              <FiZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onFit}
              className="p-1.5 rounded-lg cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              title="Fit to view"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <button
          onClick={() =>
            (astString ?? JSON.stringify(treeData, null, 2)) &&
            navigator.clipboard
              .writeText(astString ?? JSON.stringify(treeData, null, 2))
              .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
          }
          className="p-1.5 rounded-lg cursor-pointer transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          title="Copy AST"
        >
          <FiCopy className="w-3.5 h-3.5" />
        </button>
        {!inModal && (
          <button
            ref={triggerRef}
            onClick={openFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: "rgba(129,140,248,0.12)",
              border: "1px solid rgba(129,140,248,0.3)",
              color: "#C7D2FE",
            }}
            title="Open fullscreen"
          >
            <FiMaximize className="w-3.5 h-3.5" />
            Open Fullscreen
          </button>
        )}
        {inModal && (
          <button
            onClick={closeFullscreen}
            className="p-1.5 rounded-lg cursor-pointer transition-all"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(252,165,165,0.85)" }}
            aria-label="Close fullscreen"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  /* ── Main render ────────────────────────────────────────────────── */
  return (
    <div className="relative">
      {/* Inline */}
      <div className="space-y-3">
        <Toolbar inModal={false} onFit={fitInline} />
        <TreeCanvas
          canvasRef={inlineRef}
          view={inlineView}
          setView={setInlineView}
          height="70vh"
          treeData={treeData}
          renderNode={renderNode}
          viewMode={viewMode}
          error={error}
          astString={astString}
          svgClass="ast-svg"
        />
      </div>

      {/* Fullscreen modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeFullscreen(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Syntax Analysis AST fullscreen"
        >
          <div
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: "95vw",
              height: "95vh",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-mid)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.75)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                Syntax Analysis — AST
              </span>
              <Toolbar inModal onFit={fitModal} />
            </div>

            {/* Tree fills remaining space */}
            <div ref={modalRef} className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
              <TreeCanvas
                canvasRef={modalRef}
                view={modalView}
                setView={setModalView}
                height="100%"
                treeData={treeData}
                renderNode={renderNode}
                viewMode={viewMode}
                error={error}
                astString={astString}
                svgClass="ast-svg-modal"
                showMinimap
              />
            </div>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {copied && (
        <div
          className="fixed bottom-6 right-6 z-50 text-sm px-4 py-2.5 rounded-xl shadow-xl animate-fadeInOut"
          style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", color: "#A7F3D0" }}
        >
          ✓ AST copied
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TreeCanvas — proper React component so hooks are always called
   in the same order (fixes "Rendered more hooks than previous render")
   ───────────────────────────────────────────────────────────────── */
function TreeCanvas({
  canvasRef, view, setView, height,
  treeData, renderNode, viewMode, error, astString,
  svgClass = "ast-svg", showMinimap = false,
}) {
  // Ref-guarded onUpdate: prevents the react-d3-tree componentDidUpdate
  // infinite loop where every setState triggers another onUpdate call.
  const lastView = useRef(view);

  const handleUpdate = useCallback(({ zoom: z, translate: t }) => {
    const prev = lastView.current;
    if (
      Math.abs(z  - prev.zoom)        > 0.0001 ||
      Math.abs(t.x - prev.translate.x) > 0.5 ||
      Math.abs(t.y - prev.translate.y) > 0.5
    ) {
      lastView.current = { zoom: z, translate: t };
      setView({ zoom: z, translate: t });
    }
  }, [setView]);

  return (
    <div
      ref={canvasRef}
      style={{
        width: "100%",
        height,
        minHeight: 500,
        position: "relative",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <style>{`
        .${svgClass} .rd3t-node circle,
        .${svgClass} .rd3t-leaf-node circle { display: none !important; }
        .${svgClass} .rd3t-link {
          stroke: rgba(100,116,139,0.55) !important;
          stroke-width: 1.8px !important;
          fill: none !important;
        }
      `}</style>

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
          <FiAlertTriangle className="w-9 h-9" style={{ color: "#FBBF24" }} />
          <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
        </div>
      ) : viewMode === "text" ? (
        <TextAST astString={astString} />
      ) : treeData ? (
        <>
          <Tree
            data={treeData}
            orientation="vertical"
            renderCustomNodeElement={renderNode}
            translate={view.translate}
            zoom={view.zoom}
            onUpdate={handleUpdate}
            pathFunc="step"
            separation={{ siblings: 1.4, nonSiblings: 2.0 }}
            nodeSize={{ x: NODE_W, y: NODE_H }}
            zoomable
            draggable
            collapsible={false}
            hasInteractiveNodes
            svgClassName={svgClass}
          />
          {showMinimap && (
            <MiniMap
              treeData={treeData}
              zoom={view.zoom}
              translate={view.translate}
              containerRef={canvasRef}
            />
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <FiAlertTriangle className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No AST data available</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Minimap — canvas-based overview with viewport rectangle
   ───────────────────────────────────────────────────────────────── */
function MiniMap({ treeData, zoom, translate, containerRef }) {
  const canvasRef = useRef(null);
  const W = 180, H = 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !treeData) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    const pts = collectPositions(treeData);
    if (!pts.length) return;

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const tW = maxX - minX + NODE_W;
    const tH = maxY - minY + NODE_H;

    const PAD = 8;
    const scale = Math.min((W - PAD * 2) / tW, (H - PAD * 2) / tH);
    const offX  = PAD - minX * scale + ((W - PAD * 2) - tW * scale) / 2;
    const offY  = PAD - minY * scale + ((H - PAD * 2) - tH * scale) / 2;

    // Edges
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth   = 0.7;
    function drawEdges(node, px, py) {
      const kids = node.children || [];
      const span = (kids.length - 1) * NODE_W * 1.5;
      const sX   = px - span / 2;
      kids.forEach((child, i) => {
        const cx = sX + i * NODE_W * 1.5;
        const cy = py + NODE_H;
        ctx.beginPath();
        ctx.moveTo(px * scale + offX, py * scale + offY);
        ctx.lineTo(cx * scale + offX, cy * scale + offY);
        ctx.stroke();
        drawEdges(child, cx, cy);
      });
    }
    drawEdges(treeData, 0, 0);

    // Nodes
    ctx.fillStyle = "rgba(129,140,248,0.55)";
    pts.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x * scale + offX, y * scale + offY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Viewport rect
    const cW = containerRef.current?.clientWidth  ?? window.innerWidth  * 0.95;
    const cH = containerRef.current?.clientHeight ?? window.innerHeight * 0.88;
    const vpX = (-translate.x / zoom) * scale + offX;
    const vpY = (-translate.y / zoom) * scale + offY;
    const vpW = (cW / zoom) * scale;
    const vpH = (cH / zoom) * scale;
    ctx.strokeStyle = "rgba(212,165,116,0.6)";
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
  }, [treeData, zoom, translate, containerRef]);

  return (
    <div
      className="absolute bottom-4 left-4 rounded-xl overflow-hidden"
      style={{
        width: W, height: H,
        background: "rgba(8,10,16,0.88)",
        border: "1px solid var(--border-mid)",
        backdropFilter: "blur(4px)",
      }}
    >
      <canvas ref={canvasRef} width={W} height={H} />
    </div>
  );
}
