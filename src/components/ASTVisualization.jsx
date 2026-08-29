import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiAlertTriangle,
  FiCopy,
  FiMaximize,
  FiMinimize,
  FiZoomIn,
  FiZoomOut,
  FiCode,
  FiBookOpen,
  FiLoader,
  FiX,
} from "react-icons/fi";
import Tree from "react-d3-tree";

/* ─── Dark palette for node types ─────────────────────────────────── */
const NODE_COLORS = {
  operator:    { fill: "#1a1d2e", stroke: "#6366F1", label: "#a5b4fc", badge: "rgba(99,102,241,0.15)" },
  identifier:  { fill: "#1a1d2e", stroke: "#8B5CF6", label: "#c4b5fd", badge: "rgba(139,92,246,0.15)" },
  literal:     { fill: "#1a1d2e", stroke: "#10b981", label: "#6ee7b7", badge: "rgba(16,185,129,0.15)" },
  function:    { fill: "#1a1d2e", stroke: "#92400e", label: "#fbbf24", badge: "rgba(180,110,30,0.15)" },
  keyword:     { fill: "#1a1d2e", stroke: "#3b82f6", label: "#93c5fd", badge: "rgba(59,130,246,0.15)" },
  declaration: { fill: "#1a1d2e", stroke: "#06b6d4", label: "#67e8f9", badge: "rgba(6,182,212,0.15)" },
  default:     { fill: "#1a1d2e", stroke: "rgba(255,255,255,0.2)", label: "rgba(255,255,255,0.65)", badge: "rgba(255,255,255,0.05)" },
};

const MAX_LABEL_CHARS = 18;

const truncate = (str, max = MAX_LABEL_CHARS) =>
  str && str.length > max ? str.slice(0, max) + "…" : str;

/* ─── Collect all tree nodes for bounding-box calc ─────────────────── */
function collectNodes(node, x = 0, y = 0, nodeW = 200, nodeH = 120, nodes = []) {
  if (!node) return nodes;
  nodes.push({ x, y });
  if (node.children?.length) {
    const total = node.children.length;
    const startX = x - ((total - 1) * nodeW * 1.3) / 2;
    node.children.forEach((child, i) => {
      collectNodes(child, startX + i * nodeW * 1.3, y + nodeH, nodeW, nodeH, nodes);
    });
  }
  return nodes;
}

/* ─── Collapse nodes deeper than maxDepth ────────────────────────── */
function collapseDeep(node, depth = 0, maxDepth = 4) {
  if (!node) return node;
  if (depth >= maxDepth && node.children?.length) {
    const count = countDescendants(node);
    return {
      ...node,
      _collapsedCount: count,
      _collapsed: true,
      children: [],
    };
  }
  return {
    ...node,
    children: node.children?.map((c) => collapseDeep(c, depth + 1, maxDepth)),
  };
}

function countDescendants(node) {
  if (!node?.children?.length) return 0;
  return node.children.reduce(
    (sum, c) => sum + 1 + countDescendants(c),
    0
  );
}

const ASTVisualization = ({ astString, astTree }) => {
  const [treeData, setTreeData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("visual");
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(0.8);
  const [translate, setTranslate] = useState({ x: 0, y: 60 });
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const fullscreenRef = useRef(null);
  const triggerRef = useRef(null);
  const treeRef = useRef(null);

  /* ── Auto-fit: compute bounding box and set zoom + translate ─────── */
  const autoFit = useCallback((data, containerWidth, containerHeight) => {
    if (!data) return;
    const nodes = collectNodes(data);
    if (!nodes.length) return;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const treeW = maxX - minX + 200;
    const treeH = maxY - minY + 120;
    const padding = 40;
    const newZoom = Math.min(
      (containerWidth - padding * 2) / treeW,
      (containerHeight - padding * 2) / treeH,
      1.2
    );
    setZoom(Math.max(newZoom, 0.2));
    setTranslate({
      x: containerWidth / 2 - (minX + treeW / 2) * newZoom,
      y: padding + (-minY) * newZoom + 60,
    });
  }, []);

  /* ── Resize observer ─────────────────────────────────────────────── */
  useEffect(() => {
    const el = isFullscreen ? fullscreenRef.current : containerRef.current;
    if (!el || !treeData) return;
    const obs = new ResizeObserver(() => {
      autoFit(treeData, el.clientWidth, el.clientHeight);
    });
    obs.observe(el);
    autoFit(treeData, el.clientWidth, el.clientHeight);
    return () => obs.disconnect();
  }, [treeData, isFullscreen, autoFit]);

  /* ── Build tree data ─────────────────────────────────────────────── */
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    try {
      if (astTree && typeof astTree === "object" && astTree.name) {
        const fixed = fixTreeData(astTree);
        const collapsed = collapseDeep(fixed, 0, 4);
        setTreeData(collapsed);
        setIsLoading(false);
      } else if (astString && !astTree) {
        const t = setTimeout(() => {
          try {
            const def = createDefaultTree(astString);
            setTreeData(def);
          } catch (err) {
            setError(`Could not parse expression: ${err.message}`);
          } finally {
            setIsLoading(false);
          }
        }, 800);
        return () => clearTimeout(t);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setError(`Error processing AST: ${err.message}`);
      setIsLoading(false);
    }
  }, [astTree, astString]);

  /* ── Fullscreen focus trap + Escape ─────────────────────────────── */
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.activeElement;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") closeFullscreen();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (prev) prev.focus();
    };
  }, [isFullscreen]);

  const openFullscreen = () => {
    triggerRef.current = document.activeElement;
    setIsFullscreen(true);
  };
  const closeFullscreen = () => {
    setIsFullscreen(false);
    setTimeout(() => triggerRef.current?.focus(), 50);
  };

  /* ── Tree data helpers (unchanged logic from original) ──────────── */
  const fixTreeData = (tree) => {
    if (!tree) return null;
    const labelKeywords = ["IDENTIFIER","OPERATOR","LITERAL","ASSIGNMENT","SUBTRACTION","ADDITION","MULTIPLICATION","DIVISION","NUMBER","VARIABLE","EXPRESSION"];
    const isLabel = (str) => {
      if (!str || typeof str !== "string") return false;
      const u = str.toUpperCase();
      return labelKeywords.some((k) => u.includes(k)) || (str === str.toUpperCase() && str.length > 1 && /[A-Z_]/.test(str));
    };
    const getOperatorLabel = (op) => ({ "+": "ADDITION", "-": "SUBTRACTION", "*": "MULTIPLICATION", "/": "DIVISION", "=": "ASSIGNMENT", ":=": "ASSIGNMENT" })[op] || "OPERATOR";
    const fixNode = (node) => {
      if (!node) return node;
      const n = { ...node };
      if (node.attributes?.label) {
        if (isLabel(node.name) && !isLabel(node.attributes.label)) {
          n.name = node.attributes.label;
          n.attributes = { ...node.attributes, label: node.name };
        } else if (node.attributes.value && isLabel(node.attributes.value)) {
          n.attributes = { ...node.attributes, label: node.attributes.value, value: node.attributes.label };
        }
      }
      if (node.name && "+-*/=:=".includes(node.name)) {
        n.attributes = { ...n.attributes, type: "operator", label: getOperatorLabel(node.name) };
      }
      if (node.children?.length) n.children = node.children.map(fixNode);
      return n;
    };
    return fixNode(tree);
  };

  const createDefaultTree = (code) => {
    if (!code) throw new Error("Invalid or missing code");
    let expr = code;
    if (code.includes("Expression:")) {
      const m = code.match(/Expression:\s*(.+?)(?:\n|$)/);
      if (m) expr = m[1].trim();
    }
    if (!expr) throw new Error("Empty expression");
    const isAssign = expr.includes(":=") || (expr.includes("=") && !expr.includes("==") && !expr.includes("!="));
    if (isAssign) {
      const op = expr.includes(":=") ? ":=" : "=";
      const parts = expr.split(op);
      const left = parts[0].trim();
      const right = (parts[1] || "").trim();
      const getOpName = (o) => ({ "+":"ADDITION","-":"SUBTRACTION","*":"MULTIPLICATION","/":"DIVISION","%":"MODULO" })[o] || "OPERATOR";
      const parseExpr = (e) => {
        if (!e) return { name: "empty", attributes: { type: "literal", label: "EMPTY" } };
        for (const o of ["-", "+", "*", "/", "%"]) {
          if (o === "-" && e.startsWith("-")) continue;
          const idx = o === "-" ? e.lastIndexOf(o) : e.indexOf(o);
          if (idx > 0) {
            return { name: o, attributes: { type: "operator", label: getOpName(o) }, children: [parseExpr(e.slice(0, idx).trim()), parseExpr(e.slice(idx + 1).trim())] };
          }
        }
        const isNum = /^-?\d+(\.\d+)?$/.test(e);
        return { name: e, attributes: { type: isNum ? "literal" : "identifier", label: isNum ? "NUMBER" : "IDENTIFIER" } };
      };
      return { name: op, attributes: { type: "operator", label: "ASSIGNMENT" }, children: [{ name: left, attributes: { type: "identifier", label: "IDENTIFIER" } }, parseExpr(right)] };
    }
    return { name: expr, attributes: { type: "default", label: "EXPRESSION" }, children: [] };
  };

  /* ── Custom SVG node ─────────────────────────────────────────────── */
  const renderCustomNode = ({ nodeDatum }) => {
    const type = nodeDatum.attributes?.type || "default";
    const lbl = nodeDatum.attributes?.label || "";
    const c = NODE_COLORS[type] || NODE_COLORS.default;
    const isCollapsed = nodeDatum._collapsed;
    const collapsedCount = nodeDatum._collapsedCount || 0;
    const nameText = truncate(nodeDatum.name, MAX_LABEL_CHARS);
    const fullName = nodeDatum.name;
    const nodeW = 160;
    const nodeH = 44;

    return (
      <g>
        <title>{fullName}</title>
        <rect
          x={-nodeW / 2}
          y={-nodeH / 2}
          width={nodeW}
          height={nodeH}
          rx="8"
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth="1"
          style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
        />
        <text
          x="0"
          y={showLabels && lbl ? 4 : 2}
          textAnchor="middle"
          fill={c.label}
          style={{
            fontSize: "13px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontWeight: "500",
            dominantBaseline: "middle",
          }}
        >
          {nameText}
        </text>
        {showLabels && lbl && (
          <g>
            <rect
              x={-(lbl.length * 4.5 + 12) / 2}
              y={-nodeH / 2 - 20}
              width={lbl.length * 4.5 + 12}
              height={16}
              rx="8"
              fill={c.badge}
              stroke={c.stroke}
              strokeWidth="0.5"
            />
            <text
              x="0"
              y={-nodeH / 2 - 12}
              textAnchor="middle"
              fill={c.label}
              style={{
                fontSize: "9px",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: "500",
                dominantBaseline: "middle",
                letterSpacing: "0.06em",
              }}
            >
              {lbl}
            </text>
          </g>
        )}
        {isCollapsed && (
          <g>
            <rect x={-20} y={nodeH / 2 - 2} width={40} height={18} rx="9"
              fill="rgba(99,102,241,0.2)" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />
            <text x="0" y={nodeH / 2 + 9} textAnchor="middle"
              fill="#a5b4fc"
              style={{ fontSize: "10px", fontFamily: "'JetBrains Mono',monospace", dominantBaseline: "middle" }}>
              +{collapsedCount}
            </text>
          </g>
        )}
      </g>
    );
  };

  /* ── Text view ───────────────────────────────────────────────────── */
  const renderTextAST = () => {
    let code = "";
    if (astString) {
      const m = astString.match(/Expression:\s*(.+?)(?:\n|$)/);
      code = m ? m[1].trim() : astString.trim();
    }
    if (!code) code = "No expression available";
    const assignOp = code.includes(":=") ? ":=" : code.includes("=") ? "=" : "";
    const parts = assignOp ? code.split(assignOp) : [];
    const left = parts[0]?.trim() || "";
    const right = parts[1]?.trim() || "";
    const opNames = { "+":"Addition","-":"Subtraction","*":"Multiplication","/":"Division","%":"Modulo" };
    const renderExprTree = (expr) => {
      for (const o of ["-","+","*","/","%"]) {
        const idx = o === "-" ? expr.lastIndexOf("-") : expr.indexOf(o);
        if (idx > 0) {
          const lp = expr.slice(0, idx).trim();
          const rp = expr.slice(idx + 1).trim();
          return (
            <div>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--text-muted)" }}>└─</span>
                <span className="font-code" style={{ color: "#6366F1" }}>{o}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>({opNames[o]})</span>
              </div>
              <div className="pl-6 space-y-1 mt-1">
                {[lp, rp].map((part, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span style={{ color: "var(--text-muted)" }}>{i === 0 ? "├─" : "└─"}</span>
                    <span className="font-code" style={{ color: /^\d+$/.test(part) ? "#10b981" : "#a5b4fc" }}>{part}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>({/^\d+$/.test(part) ? "Number" : "Variable"})</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
      }
      return (
        <div className="flex items-center gap-2">
          <span className="font-code" style={{ color: "#a5b4fc" }}>{expr}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>({/^\d+$/.test(expr) ? "Number" : "Variable"})</span>
        </div>
      );
    };

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
            <p className="font-code text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(99,102,241,0.08)", color: "var(--text-primary)" }}>{code}</p>
          </div>
          {error ? (
            <div className="flex gap-2 text-sm" style={{ color: "rgba(252,165,165,0.9)" }}>
              <FiAlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          ) : assignOp ? (
            <div className="space-y-2 font-code text-sm">
              <div className="flex items-center gap-2">
                <span className="font-code" style={{ color: "#6366F1" }}>{assignOp}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>(Assignment)</span>
              </div>
              <div className="pl-5 space-y-1">
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--text-muted)" }}>├─</span>
                  <span className="font-code" style={{ color: "#a5b4fc" }}>{left}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>(Variable)</span>
                </div>
                {renderExprTree(right)}
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Simple expression (no assignment)</p>
          )}
        </div>
      </div>
    );
  };

  /* ── Toolbar ─────────────────────────────────────────────────────── */
  const Toolbar = ({ inModal = false }) => (
    <div className="flex flex-wrap gap-2 items-center justify-between">
      <div className="flex gap-2">
        {[
          { mode: "text", label: "Text View", icon: <FiCode className="w-3 h-3" /> },
          { mode: "visual", label: "Visual Tree", icon: <FiBookOpen className="w-3 h-3" /> },
        ].map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
            style={{
              background: viewMode === mode ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
              border: viewMode === mode ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border)",
              color: viewMode === mode ? "#a5b4fc" : "var(--text-secondary)",
            }}
          >
            {icon}{label}
          </button>
        ))}
        <button
          onClick={() => setShowLabels(!showLabels)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
          style={{
            background: showLabels ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
            border: showLabels ? "1px solid rgba(16,185,129,0.3)" : "1px solid var(--border)",
            color: showLabels ? "#6ee7b7" : "var(--text-secondary)",
          }}
        >
          {showLabels ? "Hide Labels" : "Show Labels"}
        </button>
      </div>

      <div className="flex gap-2">
        {viewMode === "visual" && (
          <>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.15))}
              className="p-1.5 rounded-lg text-xs cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              title="Zoom out"
            >
              <FiZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
              className="p-1.5 rounded-lg text-xs cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              title="Zoom in"
            >
              <FiZoomIn className="w-3.5 h-3.5" />
            </button>
            {inModal && (
              <button
                onClick={() => treeData && containerRef.current && autoFit(treeData, containerRef.current.clientWidth, containerRef.current.clientHeight)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}
              >
                Fit
              </button>
            )}
          </>
        )}
        <button
          onClick={() => astString && navigator.clipboard.writeText(astString).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
          className="p-1.5 rounded-lg text-xs cursor-pointer transition-all"
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
              background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.2))",
              border: "1px solid rgba(99,102,241,0.35)",
              color: "#a5b4fc",
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
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(252,165,165,0.9)" }}
            aria-label="Close fullscreen"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  /* ── Tree canvas shared by inline + modal ────────────────────────── */
  const TreeCanvas = ({ containerClass = "", heightStyle = {} }) => (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden ${containerClass}`}
      style={{
        backgroundColor: "#080A10",
        border: "1px solid var(--border)",
        ...heightStyle,
      }}
    >
      {error && viewMode === "visual" ? (
        <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
          <FiAlertTriangle className="w-10 h-10" style={{ color: "#fbbf24" }} />
          <p className="text-sm text-center max-w-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
        </div>
      ) : viewMode === "text" ? (
        renderTextAST()
      ) : treeData ? (
        <Tree
          ref={treeRef}
          data={treeData}
          orientation="vertical"
          renderCustomNodeElement={renderCustomNode}
          translate={translate}
          zoom={zoom}
          onUpdate={({ zoom: z, translate: t }) => { setZoom(z); setTranslate(t); }}
          pathFunc="step"
          pathClassFunc={() => "ast-link"}
          separation={{ siblings: 1.3, nonSiblings: 1.8 }}
          zoomable
          draggable
          collapsible={false}
          nodeSize={{ x: 200, y: 120 }}
          svgClassName="ast-svg"
        />
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-3">
          <FiAlertTriangle className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No AST data available</p>
        </div>
      )}

      {/* SVG link color override */}
      <style>{`
        .ast-svg .rd3t-link { stroke: rgba(255,255,255,0.12) !important; stroke-width: 1 !important; }
      `}</style>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "var(--text-muted)" }}>
        <FiLoader className="w-7 h-7 animate-spin" />
        <p className="text-sm">Generating AST…</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* ── Inline view ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Toolbar />
        <TreeCanvas heightStyle={{ height: "70vh", minHeight: 500 }} />
      </div>

      {/* ── Fullscreen modal ─────────────────────────────────────────── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeFullscreen(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Syntax Analysis AST fullscreen"
        >
          <div
            ref={fullscreenRef}
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: "95vw",
              height: "95vh",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-mid)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h2 className="font-semibold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>
                Syntax Analysis — AST
              </h2>
              <Toolbar inModal />
            </div>

            {/* Modal tree */}
            <div className="flex-1 relative overflow-hidden" ref={containerRef}>
              {error && viewMode === "visual" ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
                  <FiAlertTriangle className="w-10 h-10" style={{ color: "#fbbf24" }} />
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
                </div>
              ) : viewMode === "text" ? (
                renderTextAST()
              ) : treeData ? (
                <>
                  <Tree
                    data={treeData}
                    orientation="vertical"
                    renderCustomNodeElement={renderCustomNode}
                    translate={translate}
                    zoom={zoom}
                    onUpdate={({ zoom: z, translate: t }) => { setZoom(z); setTranslate(t); }}
                    pathFunc="step"
                    separation={{ siblings: 1.3, nonSiblings: 1.8 }}
                    zoomable
                    draggable
                    collapsible={false}
                    nodeSize={{ x: 200, y: 120 }}
                    svgClassName="ast-svg"
                  />
                  <style>{`
                    .ast-svg .rd3t-link { stroke: rgba(255,255,255,0.12) !important; stroke-width: 1 !important; }
                  `}</style>

                  {/* Mini-map */}
                  <MiniMap treeData={treeData} zoom={zoom} translate={translate} />
                </>
              ) : (
                <div className="h-full flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                  No AST data
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {copied && (
        <div className="fixed bottom-6 right-6 z-50 text-sm px-4 py-2.5 rounded-xl shadow-xl animate-fadeInOut"
          style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6ee7b7" }}>
          ✓ AST copied
        </div>
      )}
    </div>
  );
};

/* ─── Minimap ─────────────────────────────────────────────────────── */
const MiniMap = ({ treeData, zoom, translate }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !treeData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Collect all node positions (rough tree layout)
    const nodes = collectNodes(treeData);
    if (!nodes.length) return;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const tW = maxX - minX + 200;
    const tH = maxY - minY + 120;

    const scale = Math.min((W - 16) / tW, (H - 16) / tH);
    const offX = 8 - minX * scale + ((W - 16) - tW * scale) / 2;
    const offY = 8 - minY * scale + ((H - 16) - tH * scale) / 2;

    // Draw nodes
    ctx.fillStyle = "rgba(99,102,241,0.5)";
    nodes.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x * scale + offX, y * scale + offY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw edges (very rough — just parent-child lines)
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.8;
    const drawEdges = (node, px, py) => {
      if (!node?.children?.length) return;
      const total = node.children.length;
      const startX = px - ((total - 1) * 200 * 1.3) / 2;
      node.children.forEach((child, i) => {
        const cx = startX + i * 200 * 1.3;
        const cy = py + 120;
        ctx.beginPath();
        ctx.moveTo(px * scale + offX, py * scale + offY);
        ctx.lineTo(cx * scale + offX, cy * scale + offY);
        ctx.stroke();
        drawEdges(child, cx, cy);
      });
    };
    drawEdges(treeData, 0, 0);

    // Viewport rectangle
    const vpX = (-translate.x / zoom) * scale + offX;
    const vpY = (-translate.y / zoom) * scale + offY;
    const vpW = (window.innerWidth * 0.95 / zoom) * scale;
    const vpH = (window.innerHeight * 0.85 / zoom) * scale;
    ctx.strokeStyle = "rgba(99,102,241,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
  }, [treeData, zoom, translate]);

  return (
    <div
      className="absolute bottom-4 left-4 rounded-xl overflow-hidden"
      style={{
        width: 180,
        height: 120,
        background: "rgba(8,9,12,0.85)",
        border: "1px solid var(--border-mid)",
        backdropFilter: "blur(4px)",
      }}
    >
      <canvas ref={canvasRef} width={180} height={120} />
    </div>
  );
};

export default ASTVisualization;
